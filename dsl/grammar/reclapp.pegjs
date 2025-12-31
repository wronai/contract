/**
 * Reclapp DSL Grammar v1.0
 * 
 * A declarative DSL for building multi-platform business applications
 * with event sourcing, CQRS, and hardware integration.
 * 
 * Parser: Peggy (PEG.js successor)
 * Output: JSON AST
 */

{
  // Helper functions for AST construction
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

  function optionalList(items) {
    return items || [];
  }
}

// ============================================================================
// PROGRAM ROOT
// ============================================================================

Program
  = _ statements:Statement* _ {
    return makeNode('Program', {
      version: '1.0',
      statements: statements
    });
  }

// ============================================================================
// STATEMENTS
// ============================================================================

Statement
  = EntityDeclaration
  / EventDeclaration
  / PipelineDeclaration
  / AlertDeclaration
  / DashboardDeclaration
  / SourceDeclaration
  / DeviceDeclaration
  / WorkflowDeclaration
  / ConfigDeclaration

// ============================================================================
// ENTITY DECLARATION
// ============================================================================

EntityDeclaration
  = "ENTITY" _ name:Identifier _ "{" _ fields:FieldDeclaration* _ "}" _ {
    return makeNode('EntityDeclaration', {
      name: name,
      fields: fields
    });
  }

FieldDeclaration
  = "FIELD" _ name:Identifier _ ":" _ type:TypeExpression _ annotations:Annotation* _ defaultValue:DefaultValue? _ {
    return makeNode('FieldDeclaration', {
      name: name,
      fieldType: type,
      annotations: annotations,
      defaultValue: defaultValue
    });
  }

TypeExpression
  = baseType:BaseType nullable:"?"? array:"[]"? {
    return makeNode('TypeExpression', {
      baseType: baseType,
      nullable: nullable === '?',
      isArray: array === '[]'
    });
  }

BaseType
  = "UUID" / "String" / "Int" / "Float" / "Boolean" / "DateTime" 
  / "Date" / "Email" / "URL" / "JSON" / "Money" / Identifier

Annotation
  = "@" name:Identifier params:AnnotationParams? {
    return makeNode('Annotation', {
      name: name,
      params: params || []
    });
  }

AnnotationParams
  = "(" _ head:AnnotationParam tail:(_ "," _ AnnotationParam)* _ ")" {
    return extractList(head, tail, 3);
  }
  / "(" _ value:LiteralValue _ ")" {
    return [value];
  }

AnnotationParam
  = name:Identifier _ "=" _ value:LiteralValue {
    return { name: name, value: value };
  }
  / value:LiteralValue {
    return { value: value };
  }

DefaultValue
  = "=" _ value:LiteralValue { return value; }

// ============================================================================
// EVENT DECLARATION
// ============================================================================

EventDeclaration
  = "EVENT" _ name:Identifier _ "{" _ fields:EventField* _ "}" _ {
    return makeNode('EventDeclaration', {
      name: name,
      fields: fields
    });
  }

EventField
  = name:Identifier _ ":" _ type:TypeExpression _ {
    return makeNode('EventField', {
      name: name,
      fieldType: type
    });
  }

// ============================================================================
// PIPELINE DECLARATION
// ============================================================================

PipelineDeclaration
  = "PIPELINE" _ name:Identifier _ "{" _ params:PipelineParam* _ "}" _ {
    return makeNode('PipelineDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

PipelineParam
  = "INPUT" _ source:DotPath _ { return { input: source }; }
  / "TRANSFORM" _ transforms:IdentifierList _ { return { transforms: transforms }; }
  / "OUTPUT" _ outputs:IdentifierList _ { return { outputs: outputs }; }
  / "FILTER" _ condition:Expression _ { return { filter: condition }; }
  / "SCHEDULE" _ schedule:StringLiteral _ { return { schedule: schedule }; }

// ============================================================================
// ALERT DECLARATION
// ============================================================================

AlertDeclaration
  = "ALERT" _ name:StringLiteral _ "{" _ params:AlertParam* _ "}" _ {
    return makeNode('AlertDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

AlertParam
  = "ENTITY" _ entityType:Identifier _ entityName:StringLiteral? _ { 
    return { entity: { type: entityType, name: entityName } }; 
  }
  / "CONDITION" _ condition:Expression _ { return { condition: condition }; }
  / "TARGET" _ targets:TargetList _ { return { targets: targets }; }
  / "SEVERITY" _ level:Identifier _ { return { severity: level }; }
  / "THROTTLE" _ duration:StringLiteral _ { return { throttle: duration }; }

TargetList
  = head:Target tail:(_ "," _ Target)* {
    return extractList(head, tail, 3);
  }

Target
  = protocol:Identifier ":" path:TargetPath {
    return makeNode('Target', { protocol: protocol, path: path });
  }
  / name:Identifier {
    return makeNode('Target', { protocol: 'default', path: name });
  }

TargetPath
  = chars:[a-zA-Z0-9_/\-.]+ { return chars.join(''); }

// ============================================================================
// DASHBOARD DECLARATION
// ============================================================================

DashboardDeclaration
  = "DASHBOARD" _ name:StringLiteral _ "{" _ params:DashboardParam* _ "}" _ {
    return makeNode('DashboardDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

DashboardParam
  = "ENTITY" _ entityType:Identifier _ entityName:StringLiteral? _ { 
    return { entity: { type: entityType, name: entityName } }; 
  }
  / "METRICS" _ metrics:IdentifierList _ { return { metrics: metrics }; }
  / "STREAM" _ mode:Identifier _ { return { streamMode: mode }; }
  / "LAYOUT" _ layout:Identifier _ { return { layout: layout }; }
  / "REFRESH" _ interval:StringLiteral _ { return { refreshInterval: interval }; }

// ============================================================================
// SOURCE DECLARATION
// ============================================================================

SourceDeclaration
  = "SOURCE" _ name:Identifier _ "{" _ params:SourceParam* _ "}" _ {
    return makeNode('SourceDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

SourceParam
  = "TYPE" _ type:Identifier _ { return { sourceType: type }; }
  / "URL" _ url:StringLiteral _ { return { url: url }; }
  / "AUTH" _ auth:Identifier _ { return { auth: auth }; }
  / "MAPPING" _ "{" _ mappings:MappingEntry* _ "}" _ { return { mapping: mappings }; }
  / "CACHE" _ duration:StringLiteral _ { return { cacheDuration: duration }; }

MappingEntry
  = source:DotPath _ "->" _ target:Identifier _ {
    return { source: source, target: target };
  }

// ============================================================================
// DEVICE DECLARATION
// ============================================================================

DeviceDeclaration
  = "DEVICE" _ name:StringLiteral _ "{" _ params:DeviceParam* _ "}" _ {
    return makeNode('DeviceDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

DeviceParam
  = "TYPE" _ type:Identifier _ { return { deviceType: type }; }
  / "PROTOCOL" _ protocol:Identifier _ { return { protocol: protocol }; }
  / "TOPIC" _ topic:StringLiteral _ { return { topic: topic }; }
  / "SUBSCRIBE" _ events:DotPathList _ { return { subscribe: events }; }
  / "PUBLISH" _ events:DotPathList _ { return { publish: events }; }
  / "CONFIG" _ "{" _ config:ConfigEntry* _ "}" _ { return { config: config }; }

ConfigEntry
  = key:Identifier _ ":" _ value:LiteralValue _ {
    return { key: key, value: value };
  }

// ============================================================================
// WORKFLOW DECLARATION
// ============================================================================

WorkflowDeclaration
  = "WORKFLOW" _ name:Identifier _ "{" _ params:WorkflowParam* _ "}" _ {
    return makeNode('WorkflowDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

WorkflowParam
  = "TRIGGER" _ trigger:DotPath _ { return { trigger: trigger }; }
  / "STEP" _ step:StepDeclaration { return { step: step }; }
  / StepDeclaration

StepDeclaration
  = name:Identifier _ "{" _ params:StepParam* _ "}" _ {
    return makeNode('StepDeclaration', {
      name: name,
      ...Object.assign({}, ...params)
    });
  }

StepParam
  = "ACTION" _ action:Identifier _ { return { action: action }; }
  / "ON_SUCCESS" _ ":" _ "GOTO" _ target:Identifier _ { return { onSuccess: target }; }
  / "ON_FAILURE" _ ":" _ "GOTO" _ target:Identifier _ { return { onFailure: target }; }
  / "TIMEOUT" _ duration:StringLiteral _ { return { timeout: duration }; }

// ============================================================================
// CONFIG DECLARATION
// ============================================================================

ConfigDeclaration
  = "CONFIG" _ name:Identifier _ "{" _ entries:ConfigEntry* _ "}" _ {
    return makeNode('ConfigDeclaration', {
      name: name,
      entries: entries
    });
  }

// ============================================================================
// EXPRESSIONS
// ============================================================================

Expression
  = ComparisonExpression

ComparisonExpression
  = left:AdditiveExpression _ op:ComparisonOperator _ right:AdditiveExpression {
    return makeNode('BinaryExpression', {
      operator: op,
      left: left,
      right: right
    });
  }
  / AdditiveExpression

AdditiveExpression
  = left:MultiplicativeExpression _ op:AdditiveOperator _ right:AdditiveExpression {
    return makeNode('BinaryExpression', {
      operator: op,
      left: left,
      right: right
    });
  }
  / MultiplicativeExpression

MultiplicativeExpression
  = left:UnaryExpression _ op:MultiplicativeOperator _ right:MultiplicativeExpression {
    return makeNode('BinaryExpression', {
      operator: op,
      left: left,
      right: right
    });
  }
  / UnaryExpression

UnaryExpression
  = op:UnaryOperator _ expr:UnaryExpression {
    return makeNode('UnaryExpression', {
      operator: op,
      argument: expr
    });
  }
  / PrimaryExpression

PrimaryExpression
  = "(" _ expr:Expression _ ")" { return expr; }
  / FunctionCall
  / DotPath
  / LiteralValue

FunctionCall
  = name:Identifier _ "(" _ args:ArgumentList? _ ")" {
    return makeNode('FunctionCall', {
      name: name,
      arguments: args || []
    });
  }

ArgumentList
  = head:Expression tail:(_ "," _ Expression)* {
    return extractList(head, tail, 3);
  }

// ============================================================================
// OPERATORS
// ============================================================================

ComparisonOperator
  = ">=" / "<=" / "!=" / "==" / ">" / "<" / "AND" / "OR" / "IN" / "LIKE"

AdditiveOperator
  = "+" / "-"

MultiplicativeOperator
  = "*" / "/" / "%"

UnaryOperator
  = "!" / "-" / "NOT"

// ============================================================================
// LITERALS AND IDENTIFIERS
// ============================================================================

LiteralValue
  = StringLiteral
  / NumberLiteral
  / BooleanLiteral
  / NullLiteral
  / ArrayLiteral

StringLiteral
  = '"' chars:[^"]* '"' { 
    return makeNode('StringLiteral', { value: chars.join('') }); 
  }

NumberLiteral
  = digits:("-"? [0-9]+ ("." [0-9]+)?) {
    const value = parseFloat(digits.flat(Infinity).join(''));
    return makeNode('NumberLiteral', { value: value });
  }

BooleanLiteral
  = value:("true" / "false") { 
    return makeNode('BooleanLiteral', { value: value === 'true' }); 
  }

NullLiteral
  = "null" { return makeNode('NullLiteral', { value: null }); }

ArrayLiteral
  = "[" _ items:LiteralList? _ "]" {
    return makeNode('ArrayLiteral', { items: items || [] });
  }

LiteralList
  = head:LiteralValue tail:(_ "," _ LiteralValue)* {
    return extractList(head, tail, 3);
  }

Identifier
  = first:[a-zA-Z_] rest:[a-zA-Z0-9_]* { 
    return first + rest.join(''); 
  }

IdentifierList
  = head:Identifier tail:(_ "," _ Identifier)* {
    return extractList(head, tail, 3);
  }

DotPath
  = head:Identifier tail:("." Identifier)* {
    const path = [head].concat(tail.map(t => t[1]));
    return makeNode('DotPath', { 
      path: path,
      raw: path.join('.')
    });
  }

DotPathList
  = head:DotPath tail:(_ "," _ DotPath)* {
    return extractList(head, tail, 3);
  }

// ============================================================================
// WHITESPACE AND COMMENTS
// ============================================================================

_
  = (Whitespace / Comment)*

Whitespace
  = [ \t\n\r]+

Comment
  = SingleLineComment
  / MultiLineComment

SingleLineComment
  = "#" [^\n]* ("\n" / !.)

MultiLineComment
  = "/*" (!"*/" .)* "*/"
