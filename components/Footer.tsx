'use client'

import { FiMapPin, FiPhone, FiMail, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary-900 text-secondary-100">
      <div className="container-main py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Zawed</h3>
            <p className="text-sm text-secondary-400 mb-4">
              Professional B2B e-commerce platform for corporate procurement.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary-400 transition-colors">
                <FiGithub className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                <FiTwitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                <FiLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/products" className="text-secondary-400 hover:text-primary-400">
                  Products
                </a>
              </li>
              <li>
                <a href="/orders" className="text-secondary-400 hover:text-primary-400">
                  Orders
                </a>
              </li>
              <li>
                <a href="/subscriptions" className="text-secondary-400 hover:text-primary-400">
                  Subscriptions
                </a>
              </li>
              <li>
                <a href="/account" className="text-secondary-400 hover:text-primary-400">
                  Account
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-secondary-400 hover:text-primary-400">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-400 hover:text-primary-400">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-400 hover:text-primary-400">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-400 hover:text-primary-400">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <div className="space-y-3 text-sm text-secondary-400">
              <div className="flex gap-3 items-start">
                <FiMapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>123 Business Street, Corporate City, CC 12345</span>
              </div>
              <div className="flex gap-3 items-center">
                <FiPhone className="w-5 h-5" />
                <span>+1-234-567-8900</span>
              </div>
              <div className="flex gap-3 items-center">
                <FiMail className="w-5 h-5" />
                <span>support@zawed.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-secondary-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-secondary-400">
            <p>&copy; {currentYear} Zawed B2B. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
