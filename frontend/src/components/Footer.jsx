function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-semibold">Praktikum IF</p>
        <p>© {new Date().getFullYear()} Praktikum IF. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
