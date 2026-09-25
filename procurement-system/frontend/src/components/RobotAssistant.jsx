import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/*
 * RobotAssistant - Interactive SVG Robot
 * States: idle, watching, typing, hiding, happy, confused
 * Props: mood, lookAt {x, y}, size
 */
export default function RobotAssistant({ mood = 'idle', lookAt = { x: 0, y: 0 }, size = 280 }) {
  const [blink, setBlink] = useState(false);

  // Blink every 3-5 seconds
  useEffect(() => {
    if (mood === 'hiding') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [mood]);

  // Calculate eye position based on lookAt
  const maxEyeMove = 6;
  const eyeX = Math.max(-maxEyeMove, Math.min(maxEyeMove, lookAt.x * maxEyeMove));
  const eyeY = Math.max(-maxEyeMove, Math.min(maxEyeMove, lookAt.y * maxEyeMove));

  const headTilt = lookAt.x * 5;

  const eyeHeight = blink ? 1 : (mood === 'hiding' || mood === 'loading') ? 0 : 14;
  const eyeScale = mood === 'happy' ? 0.9 : mood === 'confused' ? 1.1 : 1;

  // Arm positions
  const leftArmY = (mood === 'hiding' || mood === 'peeking') ? -30 : mood === 'happy' ? -15 : mood === 'typing' ? -5 : 0;
  const rightArmY = mood === 'hiding' ? -30 : mood === 'happy' ? -15 : mood === 'typing' ? -5 : 0;
  const leftArmRotate = (mood === 'hiding' || mood === 'peeking') ? -40 : mood === 'happy' ? -20 : mood === 'typing' ? -10 : 0;
  const rightArmRotate = mood === 'hiding' ? 40 : mood === 'happy' ? 20 : mood === 'typing' ? 10 : 0;

  // Hand covering eyes (for password mode)
  const handOverEyes = mood === 'hiding' || mood === 'peeking';
  const peekingEye = mood === 'peeking';

  return (
    <motion.div
      style={{ width: size, height: size + 40, position: 'relative' }}
      animate={{
        y: mood === 'happy' ? [0, -10, 0] : mood === 'typing' ? [0, -2, 0] : [0, -6, 0],
      }}
      transition={{
        duration: mood === 'happy' ? 0.5 : mood === 'typing' ? 0.2 : 3,
        repeat: Infinity,
        ease: mood === 'happy' ? 'easeInOut' : 'easeInOut',
      }}
    >
      <svg
        viewBox="0 0 200 240"
        width={size}
        height={size + 40}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow effect */}
        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bodyGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <linearGradient id="screenGradient" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3b82f6" floodOpacity="0.2" />
          </filter>
          <filter id="innerGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="110" r="90" fill="url(#bodyGlow)" />

        {/* Antenna */}
        <motion.g
          animate={{ rotate: headTilt * 0.5 }}
          style={{ transformOrigin: '100px 45px' }}
        >
          <line x1="100" y1="45" x2="100" y2="25" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
          <motion.circle
            cx="100"
            cy="22"
            fill="#60a5fa"
            initial={{ r: 5 }}
            animate={{
              fill: mood === 'happy' ? ['#60a5fa', '#34d399', '#60a5fa'] : '#60a5fa',
              r: mood === 'happy' ? [5, 7, 5] : [5, 5, 5],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.circle
            cx="100"
            cy="22"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1"
            initial={{ r: 8, opacity: 0.5 }}
            animate={{ r: [8, 14, 8], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.g>

        {/* Ears */}
        <rect x="32" y="70" width="10" height="30" rx="5" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />
        <rect x="158" y="70" width="10" height="30" rx="5" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />

        {/* Head */}
        <motion.g
          animate={{ rotate: mood === 'confused' ? [0, -8, 8, 0] : headTilt }}
          transition={mood === 'confused' ? { duration: 0.5, repeat: 2 } : { type: 'spring', stiffness: 100 }}
          style={{ transformOrigin: '100px 85px' }}
          filter="url(#shadow)"
        >
          <rect x="45" y="48" width="110" height="80" rx="24" fill="url(#bodyGradient)" stroke="#93c5fd" strokeWidth="2" />
          
          {/* Face screen */}
          <rect x="55" y="58" width="90" height="55" rx="16" fill="url(#screenGradient)" />

          {/* Eyes */}
          <AnimatePresence>
            {mood !== 'hiding' && (
              <>
                <motion.ellipse
                  cx={78 + eyeX}
                  cy={83 + eyeY}
                  rx={10 * eyeScale}
                  fill="#60a5fa"
                  initial={{ ry: eyeHeight * 0.5 * eyeScale }}
                  animate={{
                    ry: blink ? 1 : mood === 'peeking' ? 1 : eyeHeight * 0.5 * eyeScale || 7,
                    fill: mood === 'happy' ? '#34d399' : '#60a5fa',
                  }}
                  transition={{ duration: blink ? 0.1 : 0.3 }}
                  filter="url(#innerGlow)"
                />
                <motion.ellipse
                  cx={122 + eyeX}
                  cy={83 + eyeY}
                  rx={10 * eyeScale}
                  fill="#60a5fa"
                  initial={{ ry: eyeHeight * 0.5 * eyeScale }}
                  animate={{
                    ry: blink ? 1 : eyeHeight * 0.5 * eyeScale || 7,
                    fill: mood === 'happy' ? '#34d399' : '#60a5fa',
                  }}
                  transition={{ duration: blink ? 0.1 : 0.3 }}
                  filter="url(#innerGlow)"
                />
                {/* Pupils */}
                <motion.circle
                  cx={78 + eyeX * 1.2}
                  cy={83 + eyeY * 0.8}
                  r={3}
                  fill="#fff"
                  animate={{ opacity: (blink || mood === 'peeking') ? 0 : 0.8 }}
                />
                <motion.circle
                  cx={122 + eyeX * 1.2}
                  cy={83 + eyeY * 0.8}
                  r={3}
                  fill="#fff"
                  animate={{ opacity: blink ? 0 : 0.8 }}
                />
                {/* Loading indicator inside eyes */}
                {mood === 'loading' && (
                  <motion.circle
                    cx={100}
                    cy={83}
                    r={8}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeDasharray="10 10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '100px 83px' }}
                  />
                )}
              </>
            )}
          </AnimatePresence>

          {/* Mouth */}
          <motion.path
            d={mood === 'happy'
              ? "M 85 100 Q 100 112 115 100"
              : mood === 'confused'
              ? "M 88 104 Q 100 98 112 104"
              : "M 90 103 Q 100 108 110 103"
            }
            stroke={mood === 'happy' ? '#34d399' : '#60a5fa'}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* Body */}
        <rect x="60" y="132" width="80" height="50" rx="16" fill="url(#bodyGradient)" stroke="#93c5fd" strokeWidth="2" filter="url(#shadow)" />
        
        {/* Chest light */}
        <motion.circle
          cx="100"
          cy="152"
          fill="#60a5fa"
          initial={{ r: 6 }}
          animate={{
            fill: mood === 'happy' ? ['#34d399', '#60a5fa', '#34d399'] : ['#60a5fa', '#93c5fd', '#60a5fa'],
            r: [6, 7, 6],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="152"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1"
          initial={{ r: 10, opacity: 0.4 }}
          animate={{ r: [10, 16, 10], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Chest lines */}
        <line x1="80" y1="165" x2="120" y2="165" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="85" y1="170" x2="115" y2="170" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

        {/* Left Arm */}
        <motion.g
          animate={{
            y: leftArmY,
            rotate: leftArmRotate,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 10 }}
          style={{ transformOrigin: '55px 145px' }}
        >
          <rect x="35" y="138" width="22" height="12" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />
          {(mood === 'hiding' || mood === 'peeking') && (
            <motion.rect
              x="20" y="128"
              width="28" height="20"
              rx="8"
              fill="#bfdbfe"
              stroke="#93c5fd"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
        </motion.g>

        {/* Right Arm */}
        <motion.g
          animate={{
            y: rightArmY,
            rotate: rightArmRotate,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 10 }}
          style={{ transformOrigin: '145px 145px' }}
        >
          <rect x="143" y="138" width="22" height="12" rx="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />
          {mood === 'hiding' && (
            <motion.rect
              x="152" y="128"
              width="28" height="20"
              rx="8"
              fill="#bfdbfe"
              stroke="#93c5fd"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
        </motion.g>

        {/* Legs */}
        <rect x="75" y="184" width="14" height="20" rx="7" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />
        <rect x="111" y="184" width="14" height="20" rx="7" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />

        {/* Feet */}
        <ellipse cx="82" cy="208" rx="14" ry="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />
        <ellipse cx="118" cy="208" rx="14" ry="6" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1.5" />

        {/* Shadow */}
        <ellipse cx="100" cy="225" rx="50" ry="8" fill="#3b82f6" opacity="0.08" />
      </svg>
    </motion.div>
  );
}
