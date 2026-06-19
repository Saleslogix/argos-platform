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
      errorTemplate: new Simplate([
        '<div class="customer-journey-message">{%: $.message %}</div>',
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
      operationName: 'GetAccountCustomerJourney360',
      onLoad: function onLoad() {
        const root = this.root;

        // If a previous request already determined this platform does not support the operation
        // (it returned a 404, e.g. SalesLogix 9.1/9.2), skip the request entirely and show the
        // unsupported message. This avoids re-requesting a known-missing operation on every
        // detail view for the rest of the session.
        if (this._isOperationUnsupported()) {
          root.innerHTML = this.errorTemplate.apply({ message: this.resource.unsupportedText }, this);
          return;
        }

        // The journey data request now fires when the user activates the tab, so show a loading
        // indicator immediately to give feedback while the request is in flight.
        root.innerHTML = this.loadingTemplate.apply(this);
        const request = new Sage.SData.Client.SDataServiceOperationRequest(
          App.getService(),
        )
          .setResourceKind('accounts')
          .setOperationName(this.operationName);
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
              // Replace the loading indicator with a generic error message.
              root.innerHTML = this.errorTemplate.apply({ message: this.resource.errorText }, this);
            }
          },
          failure: (response) => {
            console.error(response); // eslint-disable-line
            // Older platforms (e.g. 9.1/9.2) do not expose the GetAccountCustomerJourney360
            // operation and return a 404. Surface a message explaining that rather than a blank
            // panel, and fall back to a generic error for any other failure.
            const isUnsupported = response && response.status === 404;
            if (isUnsupported) {
              // Remember this for the rest of the session so we stop requesting it.
              this._markOperationUnsupported();
            }
            const message = isUnsupported ? this.resource.unsupportedText : this.resource.errorText;
            root.innerHTML = this.errorTemplate.apply({ message }, this);
          },
        });
      },
      /**
       * Returns the session-scoped map of service operations that have been found unavailable
       * (returned a 404). Lazily created on App.context so it is shared for the session and reset
       * when the app/context is rebuilt.
       * @return {Object} Map keyed by operation name.
       */
      _getUnsupportedOperations: function _getUnsupportedOperations() {
        if (!App.context) {
          return {};
        }
        if (!App.context.unsupportedOperations) {
          App.context.unsupportedOperations = {};
        }
        return App.context.unsupportedOperations;
      },
      /**
       * @return {Boolean} True if this widget's operation was previously found unavailable.
       */
      _isOperationUnsupported: function _isOperationUnsupported() {
        const unsupported = App.context && App.context.unsupportedOperations;
        return !!(unsupported && unsupported[this.operationName]);
      },
      /**
       * Flags this widget's operation as unavailable for the rest of the session.
       */
      _markOperationUnsupported: function _markOperationUnsupported() {
        this._getUnsupportedOperations()[this.operationName] = true;
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
