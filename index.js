'use strict';

var asObject = require('as/object');
var MessageFormat = require('messageformat');
var toSource = require('tosource');
var evalExpression = require('eval-expression');


var self = function messageformatBundle (messages, options) {
  var mf, compiledMessages, bundledMessages;

  // Validate arguments.
  if (typeof messages != 'object') throw new TypeError
    ( 'messageformat-bundle: '
    + 'The argument `messages` must be an Object.'
    );

  // Determine options.
  if (!options) options = {};
  var locale = ''+ options.locale || undefined;
  var customPlurals = options.customPlurals;
  var formatting = options.formatting || self.formatting.asModule;

  // Validate options.
  if (customPlurals && typeof customPlurals != 'function') throw new TypeError
    ( 'messageformat-bundle: '
    + 'If you provide `options.customPlurals`, it must be a function.'
    );
  if (typeof formatting != 'function') throw new TypeError
    ( 'messageformat-bundle: '
    + 'If you provide `options.formatting`, it must be a function.'
    );

  // Instantiate a clean MessageFormat.
  MessageFormat.locale = {};
  mf = new MessageFormat(locale, customPlurals);

  // Compile messages.
  compiledMessages = asObject(messages
    , function (message, key) { return (
        { key: key
        , value: evalExpression(mf.precompile(mf.parse(message)))
        }); }
    , {depth: Infinity}
    );

  // Bundle the compiled messages.
  bundledMessages = formatting(compiledMessages, mf);
  if (typeof bundledMessages != 'string') throw new TypeError
    ( 'messageformat-bundle: '
    + "The function `options.formatting` must return a string. If you're using one of our "
    + "shipped formatting functions, make sure you shouldn't initialize it before passing it "
    + "through `options`."
    );
  return new MessageformatBundle(formatting(compiledMessages, mf));
  };


self.formatting =
  { asExpression: function asExpression (compiledMessages, mf) {
    return (
      ( '(function(){'
      +   'var ' + mf.globalName + '='
      +     mf.functions()
      +     ';'
      +   'return('
      +     toSource(compiledMessages, null, 0)
      +     ');'
      +   '})()'
      ));
    }

  , get asModule () { return self.formatting.custom(
    { header: 'export default '
    , footer: ';'
    });}

  , asVariable: function asVariableMaker (name) {
    return self.formatting.custom(
      { header: 'var ' + name + ' = '
      , footer: ';'
      });
    }

  , custom: function customMaker (options) {
    var header = ''+ options.header;
    var footer = ''+ options.footer;
    var base = (typeof options.base == 'function'
      ? options.base
      : self.formatting.asExpression
      );
    return function custom (compiledMessages, mf) { return (
      ( header
      + base(compiledMessages, mf)
      + footer
      ));};
    }
  };


var MessageformatBundle = function MessageformatBundle (contents) {
  this.contents = contents;
  };
MessageformatBundle.prototype.toString = function toString () {
  return this.contents;
  };
MessageformatBundle.prototype.toBuffer = function toBuffer () {
  return new Buffer(this.contents);
  };


module.exports = self;
