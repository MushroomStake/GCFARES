import { Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

const AuthLayout = () => {
  const location = useLocation();
  const isSetPassword = location.pathname === '/set-password';

  return (
    <div className="flex min-h-screen bg-white">
    
      <div className="hidden lg:flex w-1/2 bg-sidebar text-white p-12 flex-col justify-between relative overflow-hidden">
       
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute bottom-[-50px] left-[10%] w-60 h-60 bg-white/5 rounded-full" />
        
        <div className="relative z-10 flex-1 flex flex-col pt-12">
          {!isSetPassword ? (
            <>
              <div className="flex items-center gap-4 mb-12">
                <div className="bg-white p-2 rounded-full shadow-lg">
                  <img src="/assets/gc-logo.png" alt="Gordon College Logo" className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Gordon College</h1>
                  <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Olongapo City</p>
                </div>
              </div>

              <div className="space-y-12 max-w-md">
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-[2px] w-8 bg-accent" />
                    <h2 className="text-sm font-bold tracking-widest uppercase text-accent">Vission</h2>
                  </div>
                  <p className="text-white/80 leading-relaxed font-light">
                    A globally recognized local institution committed to innovative academic excellence, holistic and sustainable development, inclusivity, and community engagement.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-[2px] w-8 bg-accent" />
                    <h2 className="text-sm font-bold tracking-widest uppercase text-accent">Mission</h2>
                  </div>
                  <p className="text-white/80 leading-relaxed font-light">
                    Produce empowered global citizens who create sustainable impact, uphold values of character, excellence, and service, and contribute to academic and societal development.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-[2px] w-8 bg-accent" />
                    <h2 className="text-sm font-bold tracking-widest uppercase text-accent">Core Values</h2>
                  </div>
                  <ul className="space-y-2 text-white/80 font-light">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">▸</span>
                      <span><strong>Character</strong> — integrity, responsibility, and lifelong learning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">▸</span>
                      <span><strong>Excellence</strong> — intellectual curiosity, innovation, and academic rigor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">▸</span>
                      <span><strong>Service</strong> — community impact and social responsibility</span>
                    </li>
                  </ul>
                </section>
              </div>
            </>
          ) : (
            <div className="max-w-md space-y-8">
              <div className="flex items-center gap-4 mb-12">
                <div className="bg-white p-2 rounded-full shadow-lg">
                  <img src="/assets/gc-logo.png" alt="Gordon College Logo" className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Gordon College</h1>
                  <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Olongapo City</p>
                </div>
              </div>

              <div className="h-[2px] w-8 bg-accent mb-6" />

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-12">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <ShieldCheck className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Security First</h4>
                    <p className="text-sm text-white/80 leading-relaxed">
                      You are currently using a temporary password assigned by the HR office. For the security of your account and the faculty portal, you must create a new personal password before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold tracking-widest uppercase text-accent mb-6 flex items-center gap-3">
                  Password Requirements
                  <span className="h-[1px] flex-1 bg-white/20" />
                </h2>
                <ul className="space-y-3 text-sm text-white/80">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>At least 8 characters long</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>Contains an uppercase letter (A-Z)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>Contains a lowercase letter (a-z)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>Contains a number (0-9)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>Contains a special character (!@#$%^&*)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-accent/40" />
                    <span>New password and confirmation match</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 text-xs text-white/50">
          © 2026 Gordon College. All rights reserved.
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
