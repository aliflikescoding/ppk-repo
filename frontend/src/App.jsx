import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 text-base-content">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-4">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold">Welcome to Praktikum IF</h1>
        <p className="mt-3">Your page content goes here.</p>
      </main>
      <Footer />
    </div>
  )
}

export default App
