import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen bg-surface">
    
      <div className="hidden lg:flex w-[55%] bg-sidebar text-white p-12 flex-col justify-between relative overflow-hidden fp-left-shell">
        <div className="fp-blob fp-blob-a" />
        <div className="fp-blob fp-blob-b" />

        <div className="relative z-10 flex-1 flex flex-col pt-12">
          <div className="fp-brand-block">
            <div className="fp-brand-badge">
              <img src="/assets/gc-logo.png" alt="Gordon College Logo" className="fp-brand-logo" />
            </div>
            <div>
              <h1>Gordon College</h1>
              <p>Olongapo City</p>
            </div>
          </div>

          <div className="space-y-10 max-w-md fp-copy-block">
            <section>
              <div className="fp-copy-kicker-row">
                <span className="fp-copy-rule" />
                <h2>Vision</h2>
              </div>
              <p>
                A globally recognized local institution committed to innovative academic excellence, holistic and sustainable development, inclusivity, and community engagement.
              </p>
            </section>

            <section>
              <div className="fp-copy-kicker-row">
                <span className="fp-copy-rule" />
                <h2>Mission</h2>
              </div>
              <p>
                Produce empowered global citizens who create sustainable impact, uphold values of character, excellence, and service, and contribute to academic and societal development.
              </p>
            </section>

            <section>
              <div className="fp-copy-kicker-row">
                <span className="fp-copy-rule" />
                <h2>Core Values</h2>
              </div>
              <ul>
                <li><strong>Character</strong> — integrity, responsibility, and lifelong learning</li>
                <li><strong>Excellence</strong> — intellectual curiosity, innovation, and academic rigor</li>
                <li><strong>Service</strong> — community impact and social responsibility</li>
              </ul>
            </section>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/50">
          © 2026 Gordon College. All rights reserved.
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-surface">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
