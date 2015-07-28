'use strict';

define(['legion/strings'], function(strings) {

  /*
    createParent() returns a function that calls childFunction with
    parentFunction added as "this.parent" to the scope of childFunction.

    @param {function} childFunction - the function to call
    @param {function} parentFunction - the function to add as this.parent

    @return {function}
  */
  var createParent = function(childFunction, parentFunction) {
    return function() {

      // Save this.parent as a temporary variable in case parent functions are
      // being called recursively. Then assign parentFunction to function.
      var tmp = this.parent;
      this.parent = parentFunction;

      // Call childFunction
      var returnValue = childFunction.apply(this, arguments);

      // Restore the old parent
      this.parent = tmp;

      return returnValue;
    };
  };


  /**
   * extend() extends the current Class with child and returns the new Class.
   *
   * @param {object} child - An object containing the properties to extend
   *   Class with.
   * @return {function} - Returns a new class extended by child.
   * @memberof Class
   * @example
   *
   * // Extend the base class to make an Animal class
   * var Animal = Class.extend({
   * 	species: null
   * });
   *
   * // Extend the Animal class to make a Cat class
   * var Cat = Animal.extend({
   * 	species: 'cat'
   * });
   */
  var extend = function(child) {
    if (child instanceof Object) {
      return this._extendSingle(child);
    }
  };


  /**
   * implement() extends the current Class with child and returns the new Class.
   * Similar to extend, except it can take other Classes/functions or an array
   * of Classes/Functions/objects instead of just a single object.  Properties
   * will be copied over into the new class from each and this.parent() works in
   * overridden functions.  But instanceof won't return true for each Class
   * provided.

   * @param {array|object|function} child - child can either be an object,
   * a function or an array of objects and/or functions.  If it is an object
   * it's properties are added to the current class; if it is a function a new
   * instance is created and it's properties are added to the current class;
   * and if it is an array each element is handled in the above manner.

   * @return {function} - Returns a new Class with this extended by child.
   *
   * @memberof Class
   * @example
   *
   * // Extend the base class to make an Animal class
   * var Animal = Class.extend({
   * 	species: null
   * });
   *
   * // Create reusable objects for things with four legs and tails
   * var fourLegged = {legs: 4};
   * var tail = {tail: true};
   *
   * // Create a cat with four legs and a tail.
   * var Cat = Animal.implement([fourlegged, tail, {species: 'cat'}]);
   */
  var implement = function(child) {

    // If child is an array then call __extendSingle repeatedly for
    // each element.
    if (child instanceof Array) {
      var _this = this;
      for (var i = 0; i < child.length; i++) {
        _this = _this._extendSingle(child[i]);
      }
      return _this;
    } else {
      return this._extendSingle(child);
    }
  };


  /**
   * _extendSingle() extends the current class by a child class.
   * It is defined inside an anonymous function to create a closure for the
   * "extending" variable.
   *
   * @param {object|function} child - child to extend the current Class with.
   * @return {function} - Returns a new class extended by child.
   * @memberof Class
   * @private
   * @function
   */
  var _extendSingle = (function() {

    /*
      A variable that is used to keep track of whether the _extendSingle
      function is currently being called.  Needed to not call the init
      function when creating a new instance of classes during extension.
    */
    var extending;

    return function(child) {

      // Base Class definition
      var Class = function() {

        // "init" is used as the constructor for Classes so don't
        // call it when we are in _extendSingle.
        if (!extending) {
          this.init.apply(this, arguments);
        }
      };

      //Class.prototype.init = function() {};
      Class.extend = extend;
      Class._extendSingle = _extendSingle;
      Class.implement = implement;

      // If child is a function, reassign child to an instance of itself.
      if (typeof child === 'function') {
        extending = true;
        child = new child(); // jshint ignore:line
        extending = false;
      }

      extending = true;
      Class.prototype = new this();
      extending = false;

      // Assign properties of the child to the new class.
      for (var key in child) {

        // If the property is a function call with this.parent assigned.
        if (typeof child[key] === 'function' &&
            typeof Class.prototype[key] === 'function') {
          Class.prototype[key] = createParent(child[key], Class.prototype[key]);
        } else {
          Class.prototype[key] = child[key];
        }
      }

      //Register the class with legion
      legion._classes[Class.prototype.className] = Class;

      return Class;
    };
  })();

  // Return the base instance of Class
  return _extendSingle.call(function() {},
  /** @lends Class# */
  {

    /**
     * The class name
     * @type {String}
     */
    className: 'Class',

    /**
     * The game that this object is bound to.
     * @type {Game}
     */
    game: null,

    /**
     * Unique ID of the object.  Get's assigned when it's bound to a game.
     * @type {number|string}
     */
    id: null,

    /**
     * The ID of the client that "owns" this entity.  null means that the
     * server owns it.
     * @type {string}
     */
    clientID: null,

    /**
     * Initialize Class.  Just calls mixin with the properties.
     *
     * @constructs Class
     * @param  {object} - properties an object of properties to mixin
     * @classdesc The base legion Class.  All legion classes extend from this.
     */
    init: function(properties) {
      this.mixin(properties, true);
    },

   /**
    * mixin() adds the properties in properties to this object.  By default
    * it will not override existing functions with functions included in the
    * properties object because this will not maintain this.parent().
    * It is recommended to use extend or implement in order to add new
    * functions.  This behavior can be overridden by passing false to the
    * safe parameter.
    * @param  {object} properties - object of properties to mixin
    * @param  {boolean} safe - whether to override functions
    * @return {object} the object
    */
    mixin: function(properties, safe) {
      for (var key in properties) {

        //Check if it's overriding a function and if using safe mode
        if (typeof properties[key] !== 'function' || !(key in this) || !safe) {
          this[key] = properties[key];
        } else {
          legion.log(strings[legion.locale].unsafeMixin);
        }
      }
      return this;
    },

   /**
    * _bindGame() binds the game object to the class when it is added to the
    * game so that the entity knows which game it is in.  Also assigns the
    * entity an id and clientID, if it doesn't have.
    *
    * @param  {Game} game The game that the entity is being added to.
    * @return {undefined}
    * @private
    */
    _bindGame: function(game) {
      this.game = game;
      if (game) {
        if (this.id === null) {
          this.id = game._getObjectID();
        }
        if (this.clientID === null) {
          this.clientID = game.clientID;
        }
      }
    },

   /**
    * serialize() returns a serializable representation of the class in the
    * format:
    *
    * <pre>
    * {
    * 	id: id,
    * 	clientID: clientID,
    * 	className: className
    * }
    * </pre>
    * 
    * @return {object} The object representation
    */
    serialize: function() {
      return {id: this.id, clientID: this.clientID, className: this.className};
    }
  });
});
