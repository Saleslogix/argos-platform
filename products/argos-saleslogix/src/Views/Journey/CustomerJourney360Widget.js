define('crm/Views/Journey/CustomerJourney360Widget', [
  'dojo/_base/declare',
  'argos/_RelatedViewWidgetBase',
  'argos/RelatedViewManager',
  'argos/I18n',
], (_declare, _RelatedViewWidgetBase, RelatedViewManager, getResource) => {
  const resource = getResource('customerJourney360Widget');
  const __class = _declare(
    'crm.Views.Journey.CustomerJourney360Widget',
    [_RelatedViewWidgetBase],
    {
      relatedContentTemplate: new Simplate([
        '<div data-dojo-attach-point="root" class="customer-journey-root"></div>',
      ]),
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

              this.renderData(root, data);
            } catch (error) {
              console.error('Error parsing JSON:', error); // eslint-disable-line
            }
          },
          failure: (response) => {
            console.error(response); // eslint-disable-line
          },
        });
      },
      renderData: function renderData(root, data) {
        root.innerHTML = '';
        const container = document.createElement('div');
        container.classList.add('customer-journey-container');
        root.appendChild(container);
        data.forEach((journey) => {
          const journeyElement = document.createElement('div');
          journeyElement.classList.add('customer-journey');

          const heading = document.createElement('h3');
          const nameText = document.createTextNode(`${journey.name} `);
          heading.appendChild(nameText);

          const displayNameSpan = document.createElement('span');
          displayNameSpan.className = 'customer-journey-display-name';
          displayNameSpan.textContent = `(${journey.entityDisplayName})`;
          heading.appendChild(displayNameSpan);
          heading.appendChild(document.createTextNode(' '));

          const entityBadge = document.createElement('span');
          entityBadge.className = 'customer-journey-entity-badge';
          entityBadge.textContent = (journey.entityType || '').replace(/^I/, '');
          heading.appendChild(entityBadge);

          journeyElement.appendChild(heading);

          if (journey.stages) {
            journey.stages.forEach((stage) => {
              const stageElement = document.createElement('div');
              stageElement.classList.add('customer-journey-stage');
              if (stage.completed) stageElement.classList.add('completed');
              if (stage.isActive) stageElement.classList.add('active');
              // Status dot
              const statusDot = document.createElement('span');
              statusDot.className = 'stage-status';
              stageElement.appendChild(statusDot);
              // Stage name
              const stageTitle = document.createElement('h4');
              stageTitle.textContent = stage.name;
              stageElement.appendChild(stageTitle);
              // Meta info
              const meta = document.createElement('span');
              meta.className = 'stage-meta';
              meta.textContent = `(${resource.actualText}: ${stage.actualDaysInStage} | ${resource.expectedText}: ${stage.expectedDaysInStage})`;
              stageElement.appendChild(meta);
              // Dates
              const startDate = stage.startDate
                ? new Date(stage.startDate).toLocaleDateString()
                : '';
              const completedDate = stage.completedDate
                ? new Date(stage.completedDate).toLocaleDateString()
                : '';
              if (startDate || completedDate) {
                const dates = document.createElement('span');
                dates.className = 'stage-dates';
                dates.textContent = `${startDate ? `${resource.startText}: ${startDate}` : ''}${
                  startDate && completedDate ? ' | ' : ''
                }${completedDate ? `${resource.completedText}: ${completedDate}` : ''}`;
                stageElement.appendChild(dates);
              }
              // Expand/collapse steps
              if (stage.steps && stage.steps.length) {
                const expandToggle = document.createElement('span');
                expandToggle.className = 'expand-toggle';
                expandToggle.textContent = resource.showStepsText;
                const stepsDiv = document.createElement('div');
                stepsDiv.className = 'customer-journey-steps';
                expandToggle.onclick = () => {
                  const isExpanded = stageElement.classList.contains('expanded');
                  if (isExpanded) {
                    stageElement.classList.remove('expanded');
                    expandToggle.textContent = resource.showStepsText;
                  } else {
                    stageElement.classList.add('expanded');
                    expandToggle.textContent = resource.hideStepsText;
                  }
                };
                stageElement.appendChild(expandToggle);
                stage.steps.forEach((step) => {
                  const stepDiv = document.createElement('div');
                  stepDiv.className = 'customer-journey-step';
                  if (step.completed) stepDiv.classList.add('completed');
                  // Step status dot
                  const stepDot = document.createElement('span');
                  stepDot.className = 'step-status-dot';
                  stepDiv.appendChild(stepDot);
                  // Step name
                  const stepName = document.createElement('span');
                  stepName.textContent = step.name;
                  stepDiv.appendChild(stepName);
                  // Step dates
                  const stepStart = step.startDate
                    ? new Date(step.startDate).toLocaleDateString()
                    : '';
                  const stepCompleted = step.completedDate
                    ? new Date(step.completedDate).toLocaleDateString()
                    : '';
                  if (stepStart || stepCompleted) {
                    const stepDates = document.createElement('span');
                    stepDates.className = 'stage-dates';
                    stepDates.textContent = `${stepStart ? `${resource.startText}: ${stepStart}` : ''}${
                      stepStart && stepCompleted ? ' | ' : ''
                    }${stepCompleted ? `${resource.completedText}: ${stepCompleted}` : ''}`;
                    stepDiv.appendChild(stepDates);
                  }
                  stepsDiv.appendChild(stepDiv);
                });
                stageElement.appendChild(stepsDiv);
              }
              journeyElement.appendChild(stageElement);
            });
          }
          container.appendChild(journeyElement);
        });
      },
    },
  );

  const rvm = new RelatedViewManager();
  rvm.registerType('customerJourney360Widget', __class);
  return __class;
});
