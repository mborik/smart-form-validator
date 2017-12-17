module.exports = function (config) {
	config.set({
		basePath: '',
		frameworks: ["jasmine", "karma-typescript"],
		files: [
			"typings/index.d.ts",
			"src/lib/**/*.ts",
			"test/**/*.ts"
		],
		preprocessors: {
			"**/*.ts": ["karma-typescript"]
		},
		karmaTypescriptConfig: {
			bundlerOptions: {
				entrypoints: /\.spec\.ts$/,
				resolve: {
					alias: {
						"moment": "jspm_packages/npm/moment@2.19.2/moment.js",
						"big.js": "jspm_packages/npm/big.js@5.0.3/big.js"
					},
					directories: [
						"src/lib",
						"node_modules",
						"jspm_modules"
					]
				}
			},
			compilerOptions: {
				baseUrl: "./",
				paths: {
					"test/*": ["test/*"],
					"src/lib/*": ["src/lib/*"]
				},
				noImplicitAny: false,
				target: "es5",
				module: "commonjs",
				moduleResolution: "node",
				lib: ["es2015", "dom"],
				removeComments: true,
				sourceMap: true,
				declaration: true,
				experimentalDecorators: true,
				emitDecoratorMetadata: true
			},
			filesGlob: [
				"src/lib/**/*.ts",
				"typings/index.d.ts",
				"custom_typings/**/*.d.ts",
				"jspm_packages/**/*.d.ts"
			],
			exclude: ["node_modules"],
			reports: {
				"html": {
					directory: "dist",
					subdirectory: "coverage",
					filename: "."
				}
			}
		},
		port: 9876,
		autoWatch : true,
		colors: true,
		reporters: ["spec", "karma-typescript"],
		browsers: ["ChromeHeadless"],
		logLevel: config.LOG_INFO,
		singleRun: false
	});
};