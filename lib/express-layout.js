var path = require('path'),
    extend = require('obj-extend');

// Helper method to check if a variable is truthy or is set to false
function isset(variable) {
  return variable || variable === false;
}

function viewRoot(view) {
  if(!Array.isArray(view.root)){
    return view.root;
  } else {
    // unfortunately, we're duplicating some of the logic from express' view,
    // because express always sets the root to the array. In a perfect world,
    // express would set view.root to the actual root, which would allow us
    // to just call path.relative(view.root,view.path).
    var roots = view.root;
    var i=0, l=roots.length;
    for (i;i<l;i++) {
      var root = roots[i];
      var viewParts = view.name.split('/');
      var file = viewParts.pop() + view.ext;
      var subPath = viewParts.join('/');
      var parent = path.join(root,subPath);
      var loc = path.resolve(parent, file);
      var dir = path.dirname(loc);
      var fullPath = view.resolve(parent,file);
      if(fullPath){
        return root;
      }
    }
  }
}

module.exports = function (settings) {
  settings = settings || {};

  return function expressLayout (req, res, next) {
    var render = res.render,
        app = req.app,
        views = app.get('views');

    // Set the default layouts path
    if (!isset(app.get('layouts'))) {
      app.set('layouts', settings.layouts || views);
    }

    // Set the default layout name
    if (!isset(app.get('layout'))) {
      app.set('layout', isset(settings.layout) ? settings.layout : 'layout');
    }

    res.render = function (view, options, fn) {
      options = options || {};

      // Support callback function as second arg
      if ('function' === typeof options) {
        fn = options;
        options = {};
      }

      // Get the layouts path and the layout name
      var layouts = options.layouts || app.get('layouts'),
          layout = isset(options.layout) ? options.layout : app.get('layout');

      // Function to wrap the template string in the template
      var callback = function wrapInTemplate (err, str) {
        if (err) {
          return next(err);
        }

        // Call original render method passing the template string as the body
        var layoutOptions = extend({ body: str }, options);
        render.call(res, layout, layoutOptions, fn);
      };

      if (!layout) {
        // Use the original callback function if we don't have a layout
        callback = fn;
      } else {
        var View = app.get('view');
        var viewOpts = {
          defaultEngine: app.get('view engine'),
          root: layouts,
          engines: app.engines
        };
        var layoutView = new View(layout, viewOpts);
        viewOpts.root = views;
        var resolvedView = new View(view, viewOpts);
        var root = viewRoot(resolvedView);
        if(!root){
          // fail if we didn't find this view
          var allDirs = views.concat(layouts);
          // unique this, as it defaults to two of the same
          allDirs = allDirs.filter(function(item, pos) { return allDirs.indexOf(item) === pos; });
          var err = new Error('Failed to lookup view "' + view + '" in views '+(allDirs.length > 1 ? 'directories' : 'directory')+' : ' + allDirs.join(','));
          return callback(err);
        } else {
          // Set the correct path to the layout relative to the views directory
          layout = path.relative(root, layoutView.path);
        }
      }

      // Call the original render method with our callback
      return render.call(res, view, options, callback);
    };

    next();
  };
};
