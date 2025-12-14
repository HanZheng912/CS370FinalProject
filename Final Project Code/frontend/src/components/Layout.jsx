import planeBg from '../assets/plane-bg.jpeg'

function Layout({ children }) {
  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `url(${planeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
      
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-black/30 backdrop-blur-sm text-white py-4 px-6 shadow-lg border-b border-white/10">
          <h1 className="text-2xl md:text-3xl font-bold">Airport Departure Planner</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-black/30 backdrop-blur-sm py-4 px-6 text-center text-sm text-white/70 border-t border-white/10">
          <p>Airport Departure Planner &copy; 2025</p>
        </footer>
      </div>
    </div>
  );
}

export default Layout;

