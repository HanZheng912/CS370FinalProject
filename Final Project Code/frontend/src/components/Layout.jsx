function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold">Airport Departure Planner</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-4 px-6 text-center text-sm text-gray-600">
        <p>Airport Departure Planner &copy; 2025</p>
      </footer>
    </div>
  );
}

export default Layout;

