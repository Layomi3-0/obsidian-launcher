import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsApp } from './App'
import '../sidepanel/styles.css'
import './options.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')
createRoot(root).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
)
