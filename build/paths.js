var appRoot = 'src/';
var outputRoot = 'dist/';
var exporSrvtRoot = 'export/'

module.exports = {
  root: appRoot,
  source: appRoot + '**/*.ts',
  html: appRoot + '**/*.html',
  locales: appRoot + 'locales/**/*.json',
  less: 'styles/styles.less',
  styles: 'styles/**/*.less',
  output: outputRoot,
  exportSrv: exporSrvtRoot,
  doc: './doc',
  dtsSrc: [
    './typings/**/*.d.ts',
    './custom_typings/**/*.d.ts'
  ]
}
