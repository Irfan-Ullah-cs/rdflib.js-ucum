const register = require('@babel/register').default || require('@babel/register')

register({
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ]
})
