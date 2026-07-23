const linkGroups = {
  Product: ['AI Tutor', 'Smart Quizzes', 'Content Upload', 'Progress Tracking', 'Study Groups'],
  Resources: ['Documentation', 'Blog', 'Community', 'API'],
  Company: ['About', 'Careers', 'Contact', 'Press'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo.svg" alt="Knowrizon" className="w-8 h-8" />
              <span className="text-lg font-bold kn-gradient-text">Knowrizon</span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed max-w-xs">
              AI-powered learning companion for students who want to study smarter, not harder.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(linkGroups).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[#475569] hover:text-[#22C7FF] transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#475569]">
            © 2026 Knowrizon. Created by{' '}
            <span className="font-medium kn-gradient-text">Kent Adrian Sabayday</span>
            {' '}for Thesis 2026.
          </p>
          <p className="text-xs text-[#334155]">
            Your Personal AI Tutor — Learn Smarter, Not Harder
          </p>
        </div>
      </div>
    </footer>
  );
}
