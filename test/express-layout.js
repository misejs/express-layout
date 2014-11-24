var path = require('path'),
    expect = require('chai').expect,
    express = require('express'),
    jade = require('jade'),
    layout = require('../lib/express-layout'),
    request = require('request');

describe('Express Layout', function () {
  function render (view, options) {
    view = view || 'hello-world';
    options = options || {};
    before(function (done) {
      var that = this;
      this.app = express();
      this.app.set('views', options.views || 'test/fixtures');
      this.app.set('view engine', 'jade');
      if (options.global) {
        var keys = Object.keys(options.global);
        keys.forEach(function (key) {
          that.app.set(key, options.global[key]);
        });
      }
      this.app.use(layout(options.instance));
      this.app.use(function (req, res) {
        res.render(view, options.render);
      });
      var server = this.app.listen(9999);
      request('http://localhost:9999', function (err, res, body) {
        that.body = body;
        server.close();
        done(err);
      });
    });
  }

  describe('without setting options', function () {
    render();
    it('should default to wrapping view in layout file', function () {
      expect(this.body).to.eql('<p><h1>Hello World</h1></p>');
    });
  });

  describe('passing a layout option', function () {
    render(null, { render: { layout: 'alternative' } });
    it('should use passed layout option as the file', function () {
      expect(this.body).to.eql('<div><h1>Hello World</h1></div>');
    });
  });

  describe('passing the layout option as false', function () {
    render(null, { render: { layout: false } });
    it('should not wrap in a layout template', function () {
      expect(this.body).to.eql('<h1>Hello World</h1>');
    });
  });

  describe('settings the options globally', function () {
    render('fixtures/hello-world', { global: {
      views: './test',
      layouts: './test/fixtures',
      layout: 'alternative'
    } });
    it('should get layout relative to the layout folder option', function () {
      expect(this.body).to.eql('<div><h1>Hello World</h1></div>');
    });
  });

  describe('passing the options on instantiation', function () {
    render('fixtures/hello-world', { global: { views: './test' }, instance: {
      layouts: './test/fixtures',
      layout: 'alternative'
    } });
    it('should use the options', function () {
      expect(this.body).to.eql('<div><h1>Hello World</h1></div>');
    });
  });

  describe('when multiple views directories are defined',function(){
    render('hello-world',{
      views : ['test/fixtures','test/fixtures/otherlayouts'],
      render : { layout : 'layout2' }
    });
    it('should find and properly render the new layout',function(){
      expect(this.body).to.eql('<main><h1>Hello World</h1></main>');
    });
  });

  describe('when multiple views directories are defined but a view is not in any of them',function(){
    render('pork',{
      views : ['test/fixtures','test/fixtures/otherlayouts'],
      render : { layout : 'layout2' }
    });
    it('should return an error mentioning that the view is invalid',function(){
      expect(this.body).to.match(/Error: Failed to lookup view &quot;pork&quot; in views directories : test\/fixtures,test\/fixtures\/otherlayouts/);
    });
  });
});
