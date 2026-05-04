import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import toast, { Toaster } from "react-hot-toast";
import LendenLogo from "../../components/LendenLogo";

const AdminLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill in all fields");
    setLoading(true);

    try {
      const res = await authAPI.adminLogin(email, password);
      login(res.data.user, res.data.token);
      toast.success("Admin login successful!");
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark-900">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1b2e', color: '#e0e0e8', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' } }} />
      <div className="fixed inset-0">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md px-6">
        <div className="glass-card p-8 sm:p-10 border border-amber-500/20 bg-dark-800/80">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <LendenLogo size={56} />
            </Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-amber-400 text-center mb-2">Admin Portal</h1>
          <p className="text-white/35 text-center mb-8 text-sm">Restricted access.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-white/45 mb-2">Admin Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@lenden.com" 
                className="input-dark w-full border-amber-500/20 focus:border-amber-500/50" 
                readOnly={loading} 
              />
            </div>
            <div>
              <label className="block text-sm text-white/45 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="input-dark w-full border-amber-500/20 focus:border-amber-500/50" 
                readOnly={loading} 
              />
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-dark-900 bg-amber-400 hover:bg-amber-300 transition-colors shadow-[0_0_15px_rgba(251,191,36,0.3)] disabled:opacity-50 mt-4">
              <span>{loading ? 'Verifying...' : 'Secure Login'}</span>
            </motion.button>
          </form>

          <div className="mt-8 text-center">
             <Link to="/login" className="text-xs text-white/30 hover:text-white/60 transition-colors">Return to public login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
