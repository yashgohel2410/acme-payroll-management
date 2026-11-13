import { PrimeReactProvider } from 'primereact/api'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes.tsx'

export function App() {
  return (
    <PrimeReactProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PrimeReactProvider>
  )
}
