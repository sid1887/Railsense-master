/**
 * Footer Component
 * Links, credits, and branding
 */
import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-accent-blue border-opacity-10 bg-gradient-to-b from-dark-bg to-darker-bg mt-16">
      {/* Gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent-blue via-50% to-transparent opacity-20" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Branding */}
          <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan mb-2">
              RailSense
            </h3>
            <p className="text-sm text-text-secondary">
              Intelligent train halt detection and real-time tracking system.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="/search" className="hover:text-accent-blue transition-colors">
                  Train Search
                </a>
              </li>
              <li>
                <a href="/map" className="hover:text-accent-blue transition-colors">
                  Live Map
                </a>
              </li>
              <li>
                <a href="/intelligence" className="hover:text-accent-blue transition-colors">
                  Intelligence Dashboard
                </a>
              </li>
            </ul>
          </div>

          {/* New: Intelligence Features */}
          <div>
            <h4 className="font-semibold text-white mb-4">AI Features</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="/test-network-intelligence" className="hover:text-accent-blue transition-colors">
                  Network Intelligence
                </a>
              </li>
              <li>
                <a href="/test-halt-analysis" className="hover:text-accent-blue transition-colors">
                  Halt Analysis
                </a>
              </li>
              <li>
                <a href="/test-explainability" className="hover:text-accent-blue transition-colors">
                  Explainability
                </a>
              </li>
              <li>
                <a href="/test-passenger-safety" className="hover:text-accent-blue transition-colors">
                  Passenger Safety
                </a>
              </li>
              <li>
                <a href="/test-cascade-analysis" className="hover:text-accent-blue transition-colors">
                  Cascade Detection
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent-blue transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-accent-blue border-opacity-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-text-secondary mb-4 md:mb-0">
              © {currentYear} RailSense. All rights reserved. Built for Indian Railways.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-text-secondary hover:text-accent-blue transition-colors"
                aria-label="GitHub"
              >
                <span className="text-lg">🐙</span>
              </a>
              <a
                href="#"
                className="text-text-secondary hover:text-accent-blue transition-colors"
                aria-label="Twitter"
              >
                <span className="text-lg">𝕏</span>
              </a>
              <a
                href="#"
                className="text-text-secondary hover:text-accent-blue transition-colors"
                aria-label="LinkedIn"
              >
                <span className="text-lg">💼</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
