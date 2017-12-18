module.exports = {
	"bundles": {
		"dist/bundle": {
			"includes": [
				"[**/*.js]",
				"**/*.html!text"
			],
			"options": {
				"inject": true,
				"minify": true,
				"depCache": true,
				"rev": false
			}
		},
		"dist/vendor": {
			"includes": [
				"jquery",
				"semantic-ui",
//				"semantic-ui-calendar",
				"big.js",
				"moment",
				"fetch",
				"text"
			],
			"options": {
				"inject": true,
				"minify": true,
				"depCache": true,
				"rev": false
			}
		},
		"dist/aurelia": {
			"includes": [
				"aurelia-bootstrapper",
				"aurelia-fetch-client",
				"aurelia-framework",
				"aurelia-history-browser",
				"aurelia-loader-default",
				"aurelia-logging-console",
				"aurelia-router",
				"aurelia-polyfills",
				"aurelia-templating-binding",
				"aurelia-templating-resources",
				"aurelia-templating-router"
			],
			"options": {
				"inject": true,
				"minify": true,
				"depCache": true,
				"rev": false
			}
		}
	}
};
