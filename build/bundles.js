module.exports = {
	"bundles": {
		"dist/app-build": {
			"includes": [
				"[**/*.js]",
				"**/*.html!text",
				"**/*.css!text",
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
				"aurelia-framework",
				"aurelia-bootstrapper",
				"aurelia-fetch-client",
				"aurelia-router",
				"aurelia-animator-css",
				"aurelia-templating-binding",
				"aurelia-polyfills",
				"aurelia-templating-resources",
				"aurelia-templating-router",
				"aurelia-loader-default",
				"aurelia-history-browser",
				"aurelia-logging-console",
				"semantic-ui/semantic.js",
//				"semantic-ui/semantic.min.css!text",
				"fetch",
				"bluebird",
				"jquery"
			],
			"options": {
				"inject": true,
				"minify": true,
				"depCache": false,
				"rev": false
			}
		}
	}
};
