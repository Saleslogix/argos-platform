define('crm/Views/Journey/CustomerJourney360Widget', [
  'dojo/_base/declare',
  'argos/_RelatedViewWidgetBase',
  'argos/RelatedViewManager',
  'argos/I18n',
], (_declare, _RelatedViewWidgetBase, RelatedViewManager, getResource) => {
  const resource = getResource('customerJourney360Widget');

  const formatDate = (dateStr) => {
    return dateStr ? new Date(dateStr).toLocaleDateString() : '';
  };

  const __class = _declare(
    'crm.Views.Journey.CustomerJourney360Widget',
    [_RelatedViewWidgetBase],
    {
      relatedContentTemplate: new Simplate([
        '<div data-dojo-attach-point="root" data-dojo-attach-event="onclick:_onClick" class="customer-journey-root"></div>',
      ]),
      containerTemplate: new Simplate([
        '<div class="customer-journey-container">',
        '{% for (var i = 0; i < $.length; i++) { %}',
        '{%= $$.journeyTemplate.apply($[i], $$) %}',
        '{% } %}',
        '</div>',
      ]),
      journeyTemplate: new Simplate([
        '<div class="customer-journey">',
        '<h3>',
        '{%: $.name %} ',
        '<span class="customer-journey-display-name">({%: $.entityDisplayName %})</span> ',
        '<span class="customer-journey-entity-badge">{%: ($.entityType || "").replace(/^I/, "") %}</span>',
        '</h3>',
        '{% if ($.stages) { %}',
        '{% for (var i = 0; i < $.stages.length; i++) { %}',
        '{%= $$.stageTemplate.apply($.stages[i], $$) %}',
        '{% } %}',
        '{% } %}',
        '</div>',
      ]),
      stageTemplate: new Simplate([
        '<div class="customer-journey-stage{% if ($.completed) { %} completed{% } %}{% if ($.isActive) { %} active{% } %}">',
        '<span class="stage-status"></span>',
        '<h4>{%: $.name %}</h4>',
        '<span class="stage-meta">({%: $$.resource.actualText %}: {%: $.actualDaysInStage %} | {%: $$.resource.expectedText %}: {%: $.expectedDaysInStage %})</span>',
        '{% var startDate = $$.formatDate($.startDate); %}',
        '{% var completedDate = $$.formatDate($.completedDate); %}',
        '{% if (startDate || completedDate) { %}',
        '<span class="stage-dates">',
        '{% if (startDate) { %}{%: $$.resource.startText %}: {%: startDate %}{% } %}',
        '{% if (startDate && completedDate) { %} | {% } %}',
        '{% if (completedDate) { %}{%: $$.resource.completedText %}: {%: completedDate %}{% } %}',
        '</span>',
        '{% } %}',
        '{% if ($.steps && $.steps.length) { %}',
        '<span class="expand-toggle">{%: $$.resource.showStepsText %}</span>',
        '<div class="customer-journey-steps">',
        '{% for (var j = 0; j < $.steps.length; j++) { %}',
        '{%= $$.stepTemplate.apply($.steps[j], $$) %}',
        '{% } %}',
        '</div>',
        '{% } %}',
        '</div>',
      ]),
      stepTemplate: new Simplate([
        '<div class="customer-journey-step{% if ($.completed) { %} completed{% } %}">',
        '<span class="step-status-dot"></span>',
        '<span>{%: $.name %}</span>',
        '{% var stepStart = $$.formatDate($.startDate); %}',
        '{% var stepCompleted = $$.formatDate($.completedDate); %}',
        '{% if (stepStart || stepCompleted) { %}',
        '<span class="stage-dates">',
        '{% if (stepStart) { %}{%: $$.resource.startText %}: {%: stepStart %}{% } %}',
        '{% if (stepStart && stepCompleted) { %} | {% } %}',
        '{% if (stepCompleted) { %}{%: $$.resource.completedText %}: {%: stepCompleted %}{% } %}',
        '</span>',
        '{% } %}',
        '</div>',
      ]),
      resource,
      formatDate,
      onLoad: function onLoad() {
        const root = this.root;
        const request = new Sage.SData.Client.SDataServiceOperationRequest(
          App.getService(),
        )
          .setResourceKind('accounts')
          .setOperationName('GetAccountCustomerJourney360');
        const entry = {
          request: {
            entity: {
              $key: this.parentEntry.$key,
            },
          },
        };
        request.execute(entry, {
          success: (response) => {
            const {
              response: { Result: result },
            } = response;

            try {
              const data = JSON.parse(result || '[]');
              data.forEach((journey) => {
                if (journey.stages) {
                  journey.stages.sort((a, b) => a.sequence - b.sequence);

                  journey.stages.forEach((stage) => {
                    if (stage.steps) {
                      stage.steps.sort((a, b) => a.sequence - b.sequence);
                    }
                  });
                }
              });

              root.innerHTML = this.containerTemplate.apply(data, this);
            } catch (error) {
              console.error('Error parsing JSON:', error); // eslint-disable-line
            }
          },
          failure: (response) => {
            console.error(response); // eslint-disable-line
          },
        });
      },
      _onClick: function _onClick(evt) {
        const toggle = evt.target.closest('.expand-toggle');
        if (!toggle) return;
        const stageElement = toggle.closest('.customer-journey-stage');
        if (!stageElement) return;
        const isExpanded = stageElement.classList.contains('expanded');
        if (isExpanded) {
          stageElement.classList.remove('expanded');
          toggle.textContent = resource.showStepsText;
        } else {
          stageElement.classList.add('expanded');
          toggle.textContent = resource.hideStepsText;
        }
      },
    },
  );

  const rvm = new RelatedViewManager();
  rvm.registerType('customerJourney360Widget', __class);
  return __class;
});
