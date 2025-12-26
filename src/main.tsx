import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json"; // ここでエラーが出ても今は無視してOKです

Amplify.configure(outputs);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
