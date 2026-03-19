'use client'

import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="h-10 w-10 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Check your email
        </h1>
        
        <p className="text-muted-foreground mb-8">
          We&apos;ve sent you a confirmation link. Please check your email to verify your account.
        </p>

        <Link
          href="/auth/login"
          className="text-primary hover:underline"
        >
          Back to login
        </Link>
      </motion.div>
    </div>
  )
}
