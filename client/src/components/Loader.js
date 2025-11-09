import { motion } from "framer-motion";

const CableNetLoader = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center">
        {/* Main Loader Container */}
        <div className="relative mb-8">
          {/* Animated Cable Ring */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Outer Glow Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-500/20"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                  "0 0 40px rgba(59, 130, 246, 0.6)",
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Rotating Cable */}
            <motion.div
              className="absolute inset-0 rounded-full border-t-4 border-l-4 border-blue-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Logo Container */}
            <div className="absolute inset-4 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              >
                <img
                  src="/cable-logo.png"
                  alt="CableNet"
                  className="w-16 h-16 object-contain"
                />
              </motion.div>
            </div>

            {/* Floating Nodes */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-blue-400 rounded-full"
                style={{
                  left: `${50 + 40 * Math.cos((i * Math.PI) / 2)}%`,
                  top: `${50 + 40 * Math.sin((i * Math.PI) / 2)}%`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
          </div>

          {/* Cable Connections */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="200" height="200" className="absolute">
              <defs>
                <linearGradient
                  id="cableGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => (
                <motion.path
                  key={i}
                  d={`M 100,100 L ${100 + 60 * Math.cos((i * Math.PI) / 2)},${
                    100 + 60 * Math.sin((i * Math.PI) / 2)
                  }`}
                  stroke="url(#cableGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            CableNet
            <span className="text-blue-400"> Management</span>
          </h1>

          <motion.p
            className="text-blue-300 text-lg font-medium mb-6 h-8"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading dashboard...
          </motion.p>

          {/* Progress Bar */}
          <div className="w-64 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          </div>

          {/* Loading Dots */}
          <div className="flex justify-center space-x-2 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CableNetLoader;
