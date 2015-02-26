define([
  'legion',
  'legion/game',
  'legion/environment'
], function(legion, Game, Environment) {
  describe('Game', function() {
    it('Create and Loop Game', function(done) {
      var g = new (Game.extend({
        loop: function() {
          this.paused = true;
          this.parent();
          done();
          done = null;
        }
      }))();
      g.environment = new Environment();
      g.loop();
    });
  });
});