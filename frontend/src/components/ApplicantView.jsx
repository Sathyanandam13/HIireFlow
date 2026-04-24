import React, { useState, useEffect } from 'react';
import { getApplicantStatus, acknowledgePromotion } from '../api';
import { Search, Clock, CheckCircle2, AlertTriangle, Info, BellRing, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function ApplicantView() {
  const [token, setToken] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [ackLoading, setAckLoading] = useState(false);

  const handleCheck = async (e) => {
    e?.preventDefault();
    if (!token.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await getApplicantStatus(token);
      setStatusData(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Status not found. Please check your token.');
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!statusData?.id) return;
    setAckLoading(true);
    try {
      await acknowledgePromotion(statusData.id);
      await handleCheck(); // Refresh status
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setAckLoading(false);
    }
  };

  // Auto poll status if not in terminal state
  useEffect(() => {
    if (!statusData || ['hired', 'rejected', 'withdrawn', 'active'].includes(statusData.status)) return;
    const interval = setInterval(() => handleCheck(), 5000);
    return () => clearInterval(interval);
  }, [statusData]);

  useEffect(() => {
    if (!statusData?.ack_deadline || statusData.status !== 'pending_ack') {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(statusData.ack_deadline).getTime();
      const distance = deadline - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [statusData]);

  const getStatusConfig = (status, position, timeExpired) => {
    if (status === 'waitlisted') {
      return {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-900',
        icon: <Clock className="text-blue-500" size={40} />,
        title: 'Waitlisted',
        message: Number(position) === 1 ? "You're next!" : "You're in queue.",
      };
    }
    if (status === 'pending_ack') {
      return {
        bg: timeExpired ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-300',
        text: timeExpired ? 'text-red-900' : 'text-yellow-900',
        icon: timeExpired ? <AlertTriangle className="text-red-500" size={40} /> : <BellRing className="text-yellow-500" size={40} animate-pulse />,
        title: timeExpired ? 'Deadline Passed' : 'Action Required',
        message: timeExpired ? "You missed your window." : "A slot has opened for you!",
      };
    }
    if (status === 'active') {
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-900',
        icon: <CheckCircle2 className="text-green-500" size={40} />,
        title: 'Active Review',
        message: "You are actively being considered.",
      };
    }
    if (status === 'rejected') {
      return {
        bg: 'bg-gray-100 border-gray-300',
        text: 'text-gray-800',
        icon: <AlertTriangle className="text-gray-500" size={40} />,
        title: 'Not Selected',
        message: "Unfortunately, you were not selected for this position.",
      };
    }
    if (status === 'hired') {
      return {
        bg: 'bg-emerald-100 border-emerald-300',
        text: 'text-emerald-900',
        icon: <CheckCircle2 className="text-emerald-600" size={40} />,
        title: 'Congratulations!',
        message: "You have been hired.",
      };
    }
    return {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-800',
      icon: <Info className="text-gray-400" size={40} />,
      title: status,
      message: "",
    };
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-900 text-white mb-5 shadow-md">
            <Search size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Application Tracker</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">Enter your secure access token to view real-time status.</p>
        </div>

        <form onSubmit={handleCheck} className="mb-8">
          <div className="relative flex items-center">
            <input
              type="text"
              className="w-full pl-5 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-mono text-sm shadow-inner"
              placeholder="e.g. abc-123-def"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !token.trim()}
              className={cn(
                "absolute right-2 top-2 bottom-2 px-6 bg-gray-900 text-white text-sm font-semibold rounded-xl transition-all hover:bg-gray-800 flex items-center gap-2",
                (loading || !token.trim()) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? '...' : <><ArrowRight size={16} /> Check</>}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3 text-center font-medium animate-in fade-in">{error}</p>}
        </form>

        {statusData && (() => {
          const isExpired = timeLeft === 'Expired';
          const config = getStatusConfig(statusData.status, statusData.position, isExpired);
          
          return (
            <div className={cn("mt-4 p-8 rounded-2xl border-2 animate-in fade-in slide-in-from-bottom-4 transition-all duration-500", config.bg, config.text)}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 bg-white p-4 rounded-full shadow-sm">
                  {config.icon}
                </div>
                
                <h3 className="text-2xl font-black tracking-tight mb-2">
                  {config.title}
                </h3>
                <p className="text-base font-medium opacity-80 mb-6">{config.message}</p>

                {statusData.status === 'waitlisted' && (
                  <div className="bg-white/60 px-8 py-4 rounded-2xl border border-blue-100 backdrop-blur-sm w-full max-w-xs">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800/60 mb-1">Queue Position</p>
                    <div className="text-5xl font-black text-blue-900">#{statusData.position}</div>
                  </div>
                )}

                {statusData.status === 'pending_ack' && !isExpired && (
                  <div className="w-full">
                    <div className="bg-white/60 p-4 rounded-2xl border border-yellow-200 backdrop-blur-sm mb-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-yellow-800/60 mb-1">Time Remaining</p>
                      <div className="font-mono font-black text-3xl text-yellow-900">
                        {timeLeft || '...'}
                      </div>
                    </div>

                    <button 
                      onClick={handleAcknowledge}
                      disabled={ackLoading}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black text-lg py-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {ackLoading ? 'Processing...' : 'Acknowledge & Accept'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
