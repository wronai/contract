/**
 * Reclapp Mini-DSL Grammar (RCL)
 * 
 * Compact, Prisma-inspired DSL for declarative app contracts.
 * ~87% reduction vs TypeScript format.
 * 
 * Parser: Peggy (PEG.js successor)
 * Output: JSON AST compatible with main Reclapp format
 */

{
  function makeNode(type, props) {
    return {
      type: type,
      ...props,
      location: location()
    };
  }

  function extractList(head, tail, index) {
    return [head].concat(tail.map(item => item[index]));
  }
}

// ============================================================================
// PROGRAM ROOT
// ============================================================================

Program
  = _ statements:(Statement _)* {
    return makeNode('Program', {
      version: '2.0',
      format: 'rcl',
      statements: statements.map(s => s[0])
    });
  }

// ============================================================================
// STATEMENTS
// ============================================================================

Statement
  = AppDeclaration
  / EntityDeclaration
  / EnumDeclaration
  / EventDeclaration
  / PipelineDeclaration
  / AlertDeclaration
  / DashboardDeclaration
  / SourceDeclaration
  / WorkflowDeclaration
  / ConfigDeclaration

// ============================================================================
// APP DECLARATION (metadata)
// ============================================================================

AppDeclaration
  = "app" _ name:StringLiteral _ "{" _ props:(AppProp _)* "}" _ {
    return makeNode('AppDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

AppProp
  = "version" _ ":" _ value:StringLiteral { return ['version', value]; }
  / "description" _ ":" _ value:StringLiteral { return ['description', value]; }
  / "author" _ ":" _ value:StringLiteral { return ['author', value]; }
  / "license" _ ":" _ value:StringLiteral { return ['license', value]; }

// ============================================================================
// ENTITY DECLARATION (compact Prisma-style)
// ============================================================================

EntityDeclaration
  = "entity" _ name:Identifier _ "{" _ fields:(FieldDeclaration _)* "}" _ {
    return makeNode('EntityDeclaration', {
      name: name,
      fields: fields.map(f => f[0])
    });
  }

FieldDeclaration
  = name:Identifier _ type:FieldType nullable:"?"? modifiers:(Modifier)* defaultValue:(_ "=" _ DefaultVal)? _ {
    return makeNode('FieldDeclaration', {
      name: name,
      fieldType: type,
      nullable: !!nullable,
      modifiers: modifiers,
      defaultValue: defaultValue ? defaultValue[3] : null
    });
  }

FieldType
  = RelationType
  / NullableArrayType
  / ArrayType
  / EnumInlineType
  / MoneyType
  / RangeType
  / BaseType

RelationType
  = dir:("->" / "<-") _ target:Identifier _? optional:"?"? _? array:"[]"? {
    return makeNode('RelationType', {
      direction: dir === '->' ? 'belongsTo' : 'hasMany',
      target: target,
      optional: !!optional,
      isArray: !!array
    });
  }

NullableArrayType
  = base:SimpleType "[]?" {
    return makeNode('ArrayType', {
      elementType: base,
      nullable: true
    });
  }

ArrayType
  = base:SimpleType "[]" {
    return makeNode('ArrayType', {
      elementType: base,
      nullable: false
    });
  }

EnumInlineType
  = "enum(" _ values:EnumValueList _ ")" {
    return makeNode('EnumType', {
      inline: true,
      values: values
    });
  }

MoneyType
  = "money(" _ currency:Identifier _ ")" {
    return makeNode('MoneyType', {
      currency: currency
    });
  }

RangeType
  = base:("int" / "text") "(" _ min:Number _ ".." _ max:Number _ ")" {
    return makeNode('RangeType', {
      baseType: base,
      min: min,
      max: max
    });
  }

BaseType
  = type:SimpleType {
    return makeNode('BaseType', {
      type: type,
      nullable: false
    });
  }

SimpleType
  = "text" / "email" / "phone" / "url" / "int" / "float" / "bool" 
  / "datetime" / "date" / "uuid" / "json" / "decimal" / "money"
  / Identifier

Modifier
  = _ "@" name:Identifier params:("(" ModifierParams ")")? {
    return makeNode('Modifier', {
      name: name,
      params: params ? params[1] : null
    });
  }

ModifierParams
  = StringLiteral / Number / Identifier

DefaultVal
  = StringLiteral / Number / BooleanLiteral / Identifier

// ============================================================================
// ENUM DECLARATION
// ============================================================================

EnumDeclaration
  = "enum" _ name:Identifier _ "{" _ values:EnumValueList _ "}" _ {
    return makeNode('EnumDeclaration', {
      name: name,
      values: values
    });
  }

EnumValueList
  = head:Identifier tail:(_ "," _ Identifier)* {
    return extractList(head, tail, 3);
  }

// ============================================================================
// EVENT DECLARATION
// ============================================================================

EventDeclaration
  = "event" _ name:Identifier _ "{" _ fields:(EventField _)* "}" _ {
    return makeNode('EventDeclaration', {
      name: name,
      fields: fields.map(f => f[0])
    });
  }

EventField
  = name:Identifier _ ":" _ type:EventFieldType nullable:"?"? _ {
    return makeNode('EventField', {
      name: name,
      fieldType: type,
      nullable: !!nullable
    });
  }

EventFieldType
  = "text" / "int" / "float" / "decimal" / "bool" / "datetime" / "date" / "uuid" / "json" / Identifier

// ============================================================================
// PIPELINE DECLARATION
// ============================================================================

PipelineDeclaration
  = "pipeline" _ name:Identifier _ "{" _ props:(PipelineProp _)* "}" _ {
    return makeNode('PipelineDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

PipelineProp
  = "input" _ ":" _ value:ArrayOrPath { return ['input', value]; }
  / "output" _ ":" _ value:ArrayOrPath { return ['output', value]; }
  / "transform" _ ":" _ value:ArrayOrPath { return ['transform', value]; }
  / "schedule" _ ":" _ value:StringLiteral { return ['schedule', value]; }
  / "filter" _ ":" _ value:ExpressionText { return ['filter', value]; }

ArrayOrPath
  = "[" _ head:DotPath tail:(_ "," _ DotPath)* _ "]" {
    return extractList(head, tail, 3);
  }
  / path:DotPath { return [path]; }

ArrayOrIdentifier
  = "[" _ head:Identifier tail:(_ "," _ Identifier)* _ "]" {
    return extractList(head, tail, 3);
  }
  / id:Identifier { return [id]; }

// ============================================================================
// ALERT DECLARATION
// ============================================================================

AlertDeclaration
  = "alert" _ name:StringLiteral _ "{" _ props:(AlertProp _)* "}" _ {
    return makeNode('AlertDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

AlertProp
  = "when" _ ":" _ value:ExpressionText { return ['condition', value]; }
  / "entity" _ ":" _ value:Identifier { return ['entity', value]; }
  / "notify" _ ":" _ value:NotifyTargets { return ['targets', value]; }
  / "severity" _ ":" _ value:Identifier { return ['severity', value]; }
  / "throttle" _ ":" _ value:StringLiteral { return ['throttle', value]; }

NotifyTargets
  = "[" _ head:NotifyTarget tail:(_ "," _ NotifyTarget)* _ "]" {
    return extractList(head, tail, 3);
  }

NotifyTarget
  = protocol:Identifier ":" path:[a-zA-Z0-9_/\-.]+ { 
    return { protocol: protocol, path: path.join('') }; 
  }
  / name:Identifier { return { protocol: 'default', path: name }; }

ExpressionText
  = chars:[^\n}]+ { return chars.join('').trim(); }

// ============================================================================
// DASHBOARD DECLARATION
// ============================================================================

DashboardDeclaration
  = "dashboard" _ name:StringLiteral _ "{" _ props:(DashboardProp _)* "}" _ {
    return makeNode('DashboardDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

DashboardProp
  = "entity" _ ":" _ value:Identifier { return ['entity', value]; }
  / "metrics" _ ":" _ value:MetricsList { return ['metrics', value]; }
  / "stream" _ ":" _ value:Identifier { return ['streamMode', value]; }
  / "layout" _ ":" _ value:Identifier { return ['layout', value]; }
  / "refresh" _ ":" _ value:StringLiteral { return ['refreshInterval', value]; }

MetricsList
  = "[" _ head:Identifier tail:(_ "," _ Identifier)* _ "]" {
    return extractList(head, tail, 3);
  }

// ============================================================================
// SOURCE DECLARATION
// ============================================================================

SourceDeclaration
  = "source" _ name:Identifier _ "{" _ props:(SourceProp _)* "}" _ {
    return makeNode('SourceDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

SourceProp
  = "type" _ ":" _ value:Identifier { return ['sourceType', value]; }
  / "url" _ ":" _ value:StringLiteral { return ['url', value]; }
  / "auth" _ ":" _ value:Identifier { return ['auth', value]; }
  / "cache" _ ":" _ value:StringLiteral { return ['cacheDuration', value]; }

// ============================================================================
// WORKFLOW DECLARATION
// ============================================================================

WorkflowDeclaration
  = "workflow" _ name:Identifier _ "{" _ props:(WorkflowProp _)* "}" _ {
    return makeNode('WorkflowDeclaration', {
      name: name,
      ...Object.fromEntries(props.filter(p => p[0]).map(p => p[0]))
    });
  }

WorkflowProp
  = "trigger" _ ":" _ value:DotPath { return [['trigger', value]]; }
  / "filter" _ ":" _ value:ExpressionText { return [['filter', value]]; }
  / step:StepDeclaration { return [['step_' + step.name, step]]; }

StepDeclaration
  = "step" _ name:Identifier _ "{" _ props:(StepProp _)* "}" _ {
    return makeNode('StepDeclaration', {
      name: name,
      ...Object.fromEntries(props.map(p => p[0]))
    });
  }

StepProp
  = "action" _ ":" _ value:Identifier { return ['action', value]; }
  / "on_success" _ ":" _ value:Identifier { return ['onSuccess', value]; }
  / "on_failure" _ ":" _ value:Identifier { return ['onFailure', value]; }
  / "timeout" _ ":" _ value:StringLiteral { return ['timeout', value]; }

// ============================================================================
// CONFIG DECLARATION
// ============================================================================

ConfigDeclaration
  = "config" _ name:Identifier _ "{" _ entries:(ConfigEntry _)* "}" _ {
    return makeNode('ConfigDeclaration', {
      name: name,
      entries: Object.fromEntries(entries.map(e => e[0]))
    });
  }

ConfigEntry
  = key:Identifier _ ":" _ value:ConfigValue { return [[key, value]]; }

ConfigValue
  = StringLiteral / Number / BooleanLiteral / ArrayLiteral

ArrayLiteral
  = "[" _ head:ConfigValue tail:(_ "," _ ConfigValue)* _ "]" {
    return extractList(head, tail, 3);
  }

// ============================================================================
// PRIMITIVES
// ============================================================================

Identifier
  = first:[a-zA-Z_] rest:[a-zA-Z0-9_]* { 
    return first + rest.join(''); 
  }

DotPath
  = head:Identifier tail:("." Identifier)* {
    return [head].concat(tail.map(t => t[1])).join('.');
  }

StringLiteral
  = '"' chars:[^"]* '"' { return chars.join(''); }

Number
  = digits:("-"? [0-9]+ ("." [0-9]+)?) {
    return parseFloat(digits.flat(Infinity).filter(Boolean).join(''));
  }

BooleanLiteral
  = "true" { return true; }
  / "false" { return false; }

// ============================================================================
// WHITESPACE AND COMMENTS
// ============================================================================

_
  = (Whitespace / Comment)*

Whitespace
  = [ \t\n\r]+

Comment
  = "//" [^\n]* ("\n" / !.)
  / "/*" (!"*/" .)* "*/"
