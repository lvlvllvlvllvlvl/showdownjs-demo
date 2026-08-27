window.onload = function () {

  //Check if AngularJs and Showdown is defined and only load ng-Showdown if both are present
  if (typeof angular !== 'undefined' && typeof showdown !== 'undefined') {
    (function (module, showdown) {
      'use strict';

      module
        .provider('$showdown', ngShowdown)
        .directive('sdModelToHtml', ['$showdown', '$sanitize', '$sce', sdModelToHtmlDirective]) //<-- DEPRECATED: will be removed in the next major version release
        .directive('markdownToHtml', ['$showdown', '$sanitize', '$sce', markdownToHtmlDirective])
        .filter('sdStripHtml', ['$showdown', stripHtmlFilter]) //<-- DEPRECATED: will be removed in the next major version release
        .filter('stripHtml', ['$showdown', stripHtmlFilter]);

      function ngShowdown() {
        var config = {
          extensions: [],
          sanitize: false
        };

        /* jshint validthis: true */
        this.setOption = function (key, value) {
          config[key] = value;
          return this;
        };

        this.getOption = function (key) {
          if (config.hasOwnProperty(key)) {
            return config[key];
          } else {
            return undefined;
          }
        };

        this.loadExtension = function (extensionName) {
          config.extensions.push(extensionName);
          return this;
        };

        function SDObject() {
          var converter = new showdown.Converter(config);

          this.makeHtml = function (markdown) {
            return converter.makeHtml(markdown);
          };

          this.stripHtml = function (text) {
            return String(text).replace(/<[^>]+>/gm, '');
          };

          this.getOption = function (key) {
            return converter.getOption(key);
          };

          this.getOptions = function () {
            return converter.getOptions();
          };

          this.setOption = function (key, value) {
            converter.setOption(key, value);
            return this;
          };

          this.getDefaultOptions = function(simple) {
            if (typeof showdown.getDefaultOptions !== 'undefined') {
              return showdown.getDefaultOptions(simple);
            } else {
              return null;
            }
          }
        }

        this.$get = function () {
          return new SDObject();
        };
      }

      function sdModelToHtmlDirective($showdown, $sanitize, $sce) {
        return {
          restrict: 'A',
          link: getLinkFn($showdown, $sanitize, $sce),
          scope: {
            model: '=sdModelToHtml'
          },
          template: '<div ng-bind-html="trustedHtml"></div>'
        };
      }

      function markdownToHtmlDirective($showdown, $sanitize, $sce) {
        return {
          restrict: 'A',
          link: getLinkFn($showdown, $sanitize, $sce),
          scope: {
            model: '=markdownToHtml'
          },
          template: '<div ng-bind-html="trustedHtml"></div>'
        };
      }

      function getLinkFn($showdown, $sanitize, $sce) {
        return function (scope, element, attrs) {
          function render(newValue) {
            var showdownHTML;
            if (typeof newValue === 'string') {
              showdownHTML = $showdown.makeHtml(newValue);
              // Trust the HTML so ng-bind-html doesn't strip checkboxes and other elements
              scope.trustedHtml = $sce.trustAsHtml(showdownHTML);
            } else {
              scope.trustedHtml = typeof newValue;
            }
          }

          // watch the markdown model
          scope.$watch('model', function (newValue) {
            render(newValue);
          });

          // watch the converter options — render again whenever options change
          scope.$watch(function () {
            try {
              return angular.toJson($showdown.getOptions());
            } catch (e) {
              return '';
            }
          }, function () {
            render(scope.model);
          });
        };
      }

      function stripHtmlFilter($showdown) {
        return function (text) {
          return $showdown.stripHtml(text);
        };
      }

    })(angular.module('ng-showdown', ['ngSanitize']), showdown);

  } else {
    throw new Error('ng-showdown was not loaded because one of its dependencies (AngularJS or Showdown) was not met');
  }

  var app = angular.module('showdown.editor', ['ng-showdown', 'pageslide-directive', 'ngAnimate', 'ngRoute', 'ngSanitize']);

  app.controller('editorCtrl', ['$scope', '$showdown', '$http', function ($scope, $showdown, $http) {

    $scope.showModal = false;
    $scope.hashTxt = '';
    $scope.checked = false;
    $scope.firstLoad = true;
    $scope.text = '';
    $scope.checkOpts = [];
    $scope.numOpts = [];
    $scope.textOpts = [];

    var text = '';
    var defaultOpts = $showdown.getDefaultOptions(false);
    var checkOpts = {
      'omitExtraWLInCodeBlocks': true,
      'noHeaderId': false,
      'parseImgDimensions': true,
      'simplifiedAutoLink': true,
      'literalMidWordUnderscores': true,
      'strikethrough': true,
      'tables': true,
      'tablesHeaderId': false,
      'ghCodeBlocks': true,
      'tasklists': true,
      'smoothLivePreview': true,
      'prefixHeaderId': false,
      'disableForced4SpacesIndentedSublists': false,
      'ghCompatibleHeaderId': true,
      'smartIndentationFix': false
    };
    var numOpts = {
      'headerLevelStart': 3
    };
    var textOpts = {};

    if (defaultOpts !== null) {
      for (var opt in defaultOpts) {
        if (defaultOpts.hasOwnProperty(opt)) {
          var nOpt = (defaultOpts[opt].hasOwnProperty('defaultValue')) ? defaultOpts[opt].defaultValue : true;
          if (defaultOpts[opt].type === 'boolean') {
            if (!checkOpts.hasOwnProperty(opt)) {
              checkOpts[opt] = nOpt;
            }
          } else if (defaultOpts[opt].type === 'integer') {
            if (!numOpts.hasOwnProperty(opt)) {
              numOpts[opt] = nOpt;
            }
          } else {
            if (!textOpts.hasOwnProperty(opt)) {
              if (opt === 'ghCompatibleHeaderId') {
                continue;
              }
              if (!nOpt) {
                nOpt = '';
              }
              textOpts[opt] = nOpt;
            }
          }
        }
      }
    }

    for (opt in checkOpts) {
      if (checkOpts.hasOwnProperty(opt)) {
        $scope.checkOpts.push({name: opt, value: checkOpts[opt]});
      }
    }

    for (opt in numOpts) {
      if (numOpts.hasOwnProperty(opt)) {
        $scope.numOpts.push({name: opt, value: numOpts[opt]});
      }
    }

    for (opt in textOpts) {
      if (textOpts.hasOwnProperty(opt)) {
        $scope.textOpts.push({name: opt, value: textOpts[opt]});
      }
    }

    $scope.toggleMenu = function () {
      $scope.firstLoad = false;
      $scope.checked = !$scope.checked;
    };

    $scope.getHash = function () {
    };

    $scope.closeModal = function () {
      $scope.showModal = false;
    };

    $scope.updateOptions = function () {
      for (var i = 0; i < $scope.checkOpts.length; ++i) {
        $showdown.setOption($scope.checkOpts[i].name, $scope.checkOpts[i].value);
      }

      for (i = 0; i < $scope.numOpts.length; ++i) {
        if ($scope.numOpts[i].name === 'headerLevelStart') {
          if (isNaN($scope.numOpts[i].value) || $scope.numOpts[i].value < 1) {
            $scope.numOpts[i].value = 1;
          } else if ($scope.numOpts[i].value > 6) {
            $scope.numOpts[i].value = 6;
          }
        }
        $showdown.setOption($scope.numOpts[i].name, $scope.numOpts[i].value);
      }

      for (i = 0; i < $scope.textOpts.length; ++i) {
        $showdown.setOption($scope.textOpts[i].name, $scope.textOpts[i].value);
      }

      // No persistence: do not save cookies or sessionStorage. The directive watches converter options and will re-render.
    };

    $scope.repaint = function () {
      // trigger a re-render by calling updateOptions (directive watches getOptions)
      $scope.updateOptions();
    };

    $scope.updateOptions();

    var defHtml = $http.get('md/text.md');
    defHtml
      .then(function(res) {
        $scope.text = res.data;
        return $http.get('//raw.githubusercontent.com/wiki/showdownjs/showdown/Showdown\'s-Markdown-syntax.md');
      })
      .then(function(res) {
        $scope.text = $scope.text + '\n\n' + res.data;
      })
      .catch(function (error) {
        $scope.text = '';
        console.log(error);
      });
  }]);

  angular.bootstrap(document, ['showdown.editor']);
};
