import React from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export function render({ products = null, path = '/' } = {}) {
  return renderToString(<App initialProducts={products} initialPath={path} />)
}
