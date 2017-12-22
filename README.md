# Smart Form Builder
**Build a better web forms with advanced realtime field validation driven by simple expression evaluation.**

- Best fit on forms for different professions who work with finances:
  * accountants _(filling the tax returns)_
  * actuaries of insurance companies _(risk assessments, statistics...)_
  * bankers and mortgage specialists
  * brokers, traders _(realtime streamlined trades, swaps)_

- Complex solution that can be easily implemented because of **fields descriptor system**.
  It describing not only the predefined type of field _(text-boxes for numbers or strings, date picker, checkbox, combo box...)_, but also a simple math-like formulas for validator, optionally suggested value and dynamic texts for field's tooltip.
- Visual feedback not only on fields that are required but also on that fields that have a validation or syntactic error which are distinguished.
- Every field's value is **exposed as variable** that can be used in another field's formula. Every field has own **dependent fields**.
- High accuracy of mathematical calculations because of **advanced precise number implementation** on client's side, instead of loose JavaScript floating-point number representation (IEEE-754).
- Solution reduces a requirements for the duration of development and maintenance of implementation.


## Installation steps
To run the app, follow these steps.

1. Ensure that [NodeJS](http://nodejs.org/) is installed. This provides the platform on which the build tooling runs.
2. From the project folder, execute the following command:

  ```shell
  npm install
  ```
3. Ensure that [Gulp](http://gulpjs.com/) is installed globally. If you need to install it, use the following command:

  ```shell
  npm install -g gulp
  ```
  > **Note:** Gulp must be installed globally, but a local version will also be installed to ensure a compatible version is used for the project.
4. Ensure that [jspm](http://jspm.io/) is installed globally. If you need to install it, use the following command:

  ```shell
  npm install -g jspm
  ```
  > **Note:** jspm must be installed globally, but a local version will also be installed to ensure a compatible version is used for the project.

  > **Note:** jspm queries GitHub to install semver packages, but GitHub has a rate limit on anonymous API requests. It is advised that you configure jspm with your GitHub credentials in order to avoid problems. You can do this by executing `jspm registry config github` and following the prompts. If you choose to authorize jspm by an access token instead of giving your password (see GitHub `Settings > Personal Access Tokens`), `public_repo` access for the token is required.
5. Install the client-side dependencies with jspm:

  ```shell
  jspm install -y
  ```
  >**Note:** Windows users, if you experience an error of "unknown command unzip" you can solve this problem by doing `npm install -g unzip` and then re-running `jspm install`.
6. Ensure that Definitely Typed typings are installed locally.

  ```shell
  npm install -g typings
  typings install
  ```
7. To run the app, execute the following command:

  ```shell
  gulp watch
  ```
8. Browse to [http://localhost:9000](http://localhost:9000) to see the app. You can make changes in the code found under `src` and the browser should auto-refresh itself as you save files.

> The Skeleton App uses [BrowserSync](http://www.browsersync.io/) for automated page refreshes on code/markup changes concurrently across multiple browsers. If you prefer to disable the mirroring feature set the [ghostMode option](http://www.browsersync.io/docs/options/#option-ghostMode) to false


## Bundling
Bundling is performed by [Aurelia Bundler](http://github.com/aurelia/bundler). A gulp task is already configured for that. Use the following command to bundle the app:

  ```shell
  gulp bundle
  ```

You can also unbundle using the command bellow:

  ```shell
  gulp unbundle
  ```

To start the bundled app, execute the following command:

  ```shell
  gulp serve-bundle
  ```


## Running The Unit Tests

To run the unit tests, first ensure that you have followed the steps above in order to install all dependencies and successfully build the library. Once you have done that, proceed with these additional steps:

1. Ensure that the [Karma](http://karma-runner.github.io/) and [Jasmine](https://jasmine.github.io/) are installed in `node_modules`. If not, follow the section [Installation steps](#installation-steps).
2. You can now run a single run of unit tests with this command:

  ```shell
  gulp test
  ```
3. Or you can now run the tests and watch for changes with this command:

  ```shell
  gulp tdd
  ```
4. Or you can install `npm install -g karma-cli` and run tests & watch the changes with:

  ```shell
  karma start
  ```


## Exporting bundled production version
A gulp task is already configured for that. Use the following command to export the app:

  ```shell
  gulp export
  ```
The app will be exported into ```export``` directory preserving the directory structure.

To start the exported app, execute the following command:

  ```shell
  gulp serve-export
  ```

#### Configuration
The configuration is done by ```bundles.js``` file.
##### Optional
Under ```options``` of ```dist/aurelia``` add ```rev: true``` to add bundle file revision/version.
In addition, ```export.js``` file is available for including individual files.
