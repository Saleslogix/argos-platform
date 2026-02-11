define('crm/Views/WorkflowInstances/List', [
  'dojo/_base/declare',
  'argos/List',
  'crm/Format',
], (declare, List, Format) => {
  const __class = declare('crm.Views.WorkflowInstances.List', [List], {
    formatter: Format,
    id: 'account_workflow_related',
    entityName: 'WorkflowInstance',
    resourceKind: 'workflowInstances',
    dateFormatText: 'M/D/YYYY h:mm',
    itemTemplate: new Simplate([
      '<h3>{%: $.descriptor %}</h3>',
      '<h4>Entity: {%: $.EntityName %}</h4>',
      '<h4>Is Active?: {%: $.IsActive %}</h4>',
      '<h4>Last Active Step: {%: $.ActiveStepName %}</h4>',
      '<h4>Started: {%: $$.formatter.date($.StartDate, $$.dateFormatText) %}</h4>',
      '<h4>Completed: {%: $$.formatter.date($.CompletedDate, $$.dateFormatText) %}</h4>',
    ]),
    createIndicatorLayout: function createIndicatorLayout() {
      return [];
    },
  });
  return __class;
});
