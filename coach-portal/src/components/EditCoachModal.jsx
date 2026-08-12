// src/components/EditCoachModal.jsx
import React, { useState, useEffect } from 'react';
import { X, BadgeCheck, ShieldCheck, Eye, Trash2, Ban, PartyPopper, CheckCircle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getFileURL } from '../firebase/services';

export default function EditCoachModal({ editingCoach, setEditingCoach, handleSaveCoachEdit, handleDeleteCoach, isNewCoach }) {
  const [formData, setFormData] = useState({ ...editingCoach });
  const [resolvedUrls, setResolvedUrls] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Safely resolve URLs on mount without triggering 400 errors for legacy data
  useEffect(() => {
    const resolveUrls = async () => {
      if (!formData.certs) return;
      const urls = {};
      const certKeys = ['sncs', 'moe', 'firstAid'];
      
      for (const key of certKeys) {
        const cert = formData.certs[key];
        // Only attempt to resolve if it's a new-style object with a path/URL
        if (cert && typeof cert === 'object') {
          if (cert.downloadURL) {
            urls[key] = cert.downloadURL;
          } else if (cert.filePath) {
            try {
              urls[key] = await getFileURL(cert.filePath);
            } catch (err) {
              console.error(`Error resolving URL for ${key}:`, err);
            }
          }
        }
      }
      setResolvedUrls(urls);
    };

    resolveUrls();
  }, [formData.certs]);

  if (!editingCoach) return null;

  const isAdmin = formData.role === 'Admin';
  const needsVetting = formData.status === 'Needs Vetting' && !isAdmin;

  const handleTextChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value) }));
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      tier: newRole === 'Admin' ? 'Admin' : 'Junior Coach',
      leadRate: newRole === 'Admin' ? 0 : prev.leadRate,
      assistRate: newRole === 'Admin' ? 0 : prev.assistRate
    }));
  };

  const handleCertUpload = (e, certKey) => {
    const file = e.target.files[0];
    if (file) setFormData(prev => ({ ...prev, certs: { ...prev.certs, [certKey]: file.name } }));
  };

  const handleSncsLevelChange = (e) => {
    const level = e.target.value;
    const isLifetime = ['L1', 'L2', 'L3'].includes(level);
    setFormData(prev => ({ ...prev, sncsLevel: level, sncsExpiry: isLifetime ? '' : prev.sncsExpiry }));
  };

  const handleSave = () => {
    const dataToSave = { ...formData };
    if (dataToSave.role === 'Admin') dataToSave.status = 'Active';
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);
    handleSaveCoachEdit(dataToSave);
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleApprove = () => {
    const dataToSave = { ...formData, status: 'Active', rejectionReason: '' };
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);
    handleSaveCoachEdit(dataToSave);

    setShowSuccessModal(true);
    triggerConfetti();
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection so the coach knows what to fix.");
      return;
    }
    const dataToSave = { ...formData, status: 'Pending', rejectionReason: rejectReason };
    Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);
    handleSaveCoachEdit(dataToSave);
  };

  const handleDelete = () => {
    const name = formData.name || 'this staff member';
    if (window.confirm(`WARNING: Are you absolutely sure you want to delete ${name} from the system? This action cannot be undone.`)) {
      handleDeleteCoach(formData.id);
    }
  };

  const isLifetimeSncs = ['L1', 'L2', 'L3'].includes(formData.sncsLevel);

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-emerald-600 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Staff Deployed!</h3>
          <p className="text-slate-600 font-medium mb-8 leading-relaxed">
            <strong>{formData.name}</strong> is now verified and ready to be assigned to shifts.
          </p>
          <button
            onClick={() => setEditingCoach(null)}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-sm"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 text-white flex justify-between items-center bg-slate-800 shrink-0">
          <h3 className="font-bold text-lg">Admin: Edit Staff Profile</h3>
          <button onClick={() => setEditingCoach(null)} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {needsVetting && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl font-medium text-sm shadow-sm">
              <strong>{formData.name}</strong> has submitted their profile for review. Please check the documents and data below.
            </div>
          )}

          {formData.rejectionReason && !needsVetting && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm italic font-medium">
              Previous Rejection Reason: "{formData.rejectionReason}"
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">Account Setup</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">FULL NAME</label>
                <input type="text" name="name" value={formData.name} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">CALENDAR NICKNAME</label>
                <input type="text" name="nickname" value={formData.nickname || ''} onChange={handleTextChange} placeholder="Set by user" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">LOGIN EMAIL</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">PASSWORD (TEMP/RESET)</label>
                <input type="text" name="password" value={formData.password || ''} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-teal-500 outline-none font-mono" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-6">
                  <input type="checkbox" name="mustChangePassword" checked={formData.mustChangePassword || false} onChange={(e) => setFormData(prev => ({ ...prev, mustChangePassword: e.target.checked }))} className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase">Must change password on next login</span>
                </label>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">SYSTEM ROLE</label>
                  <select name="role" value={formData.role || 'Coach'} onChange={handleRoleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-slate-50 font-bold text-slate-700">
                    <option value="Coach">Coach</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">COACH TIER</label>
                  <select name="tier" value={formData.tier} onChange={handleTextChange} disabled={isAdmin} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400">
                    <option value="Junior Coach">Junior Coach</option>
                    <option value="Senior Coach">Senior Coach</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">LEAD RATE</label>
                  <input type="number" name="leadRate" value={formData.leadRate} onChange={handleTextChange} disabled={formData.tier === 'Junior Coach' || isAdmin} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-emerald-50 text-emerald-700 font-bold disabled:bg-gray-100 disabled:text-gray-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ASSIST RATE</label>
                  <input type="number" name="assistRate" value={formData.assistRate} onChange={handleTextChange} disabled={isAdmin} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-emerald-50 text-emerald-700 font-bold disabled:bg-gray-100 disabled:text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 border-b pb-2">Compliance Vetting</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">SNCS LEVEL</label>
                  <select name="sncsLevel" value={formData.sncsLevel} onChange={handleSncsLevelChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-bold text-teal-700">
                    <option value="L1">SNCS Level 1</option>
                    <option value="L2">SNCS Level 2</option>
                    <option value="L3">SNCS Level 3</option>
                    <option value="WS">Wall Supervisor</option>
                    <option value="Cat1">SSCMF Category 1</option>
                    <option value="Cat2">SSCMF Category 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-teal-600 mb-2 uppercase tracking-wider">ADMIN OVERRIDE: EXPIRY DATES</label>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                     <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase">SNCS Expiry</label>
                       {isLifetimeSncs ? (
                         <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 uppercase tracking-widest">Lifetime Validation</div>
                       ) : (
                         <input 
                           type="date" 
                           name="sncsExpiry" 
                           value={formData.sncsExpiry || ''} 
                           onChange={handleTextChange}
                           className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-teal-500 outline-none font-bold text-gray-900" 
                         />
                       )}
                     </div>
                     <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase">MOE Expiry</label>
                       <input 
                         type="date" 
                         name="moeExpiry" 
                         value={formData.moeExpiry || ''} 
                         onChange={handleTextChange}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-teal-500 outline-none font-bold text-gray-900" 
                       />
                     </div>
                     <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-black text-gray-400 uppercase">First Aid Expiry</label>
                       <input 
                         type="date" 
                         name="faExpiry" 
                         value={formData.faExpiry || ''} 
                         onChange={handleTextChange}
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-teal-500 outline-none font-bold text-gray-900" 
                       />
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {['sncs', 'moe', 'firstAid'].map((certKey) => {
                  const cert = formData.certs?.[certKey];
                  const fileName = typeof cert === 'object' ? cert.fileName : cert;
                  const url = resolvedUrls[certKey] || (typeof cert === 'object' ? cert.downloadURL : null);
                  const isImage = fileName?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
                  const isPDF = fileName?.match(/\.pdf$/i);

                  return (
                    <div key={certKey} className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{certKey.replace(/([A-Z])/g, ' $1').trim()} Document</span>
                          {cert ? (
                            <div className="flex items-center gap-2 mt-1">
                              <BadgeCheck className="w-3 h-3 text-emerald-600" />
                              <span className="text-xs text-emerald-700 font-bold truncate max-w-[200px]">{fileName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 mt-1 italic">No file uploaded</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="relative">
                             <input type="file" id={`cert-${certKey}`} accept="image/*,application/pdf" className="hidden" onChange={(e) => handleCertUpload(e, certKey)} />
                             <label htmlFor={`cert-${certKey}`} className="cursor-pointer bg-white border border-gray-300 hover:bg-slate-50 text-gray-600 text-[10px] font-black px-3 py-1.5 rounded-md shadow-sm uppercase tracking-wider">Override</label>
                           </div>
                        </div>
                      </div>

                      {/* Document Preview Rendering */}
                      {cert && url ? (
                        <div className="mt-2 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                          {isImage ? (
                            <div className="relative group">
                              <img
                                src={url}
                                alt={fileName}
                                className="w-full h-48 md:h-64 object-contain bg-slate-200 cursor-pointer transition-opacity group-hover:opacity-90"
                                onClick={() => window.open(url, '_blank')}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 pointer-events-none">
                                 <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          ) : isPDF ? (
                            <div className="w-full h-[400px] md:h-[500px] bg-slate-200/50 relative group">
                              <iframe
                                src={`${url}#toolbar=0&navpanes=0`}
                                className="w-full h-full border-none shadow-inner"
                                title={fileName}
                              ></iframe>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => window.open(url, '_blank')}
                                  className="bg-white/90 backdrop-blur-sm text-teal-700 p-2 rounded-lg shadow-md hover:bg-white transition-all border border-teal-100"
                                  title="Open Fullscreen"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs text-gray-500 italic">Preview not available for this file type</div>
                          )}
                        </div>
                      ) : cert && !url ? (
                        <div className="mt-2 p-4 bg-orange-50 rounded-xl border border-orange-200 flex flex-col items-center text-center">
                          <FileText className="w-8 h-8 text-orange-400 mb-2" />
                          <span className="text-xs text-orange-800 font-medium">Legacy file format detected.</span>
                          <span className="text-[10px] text-orange-600 mt-1">This document was uploaded before the new system update and cannot be previewed inline. Please ask the staff member to re-upload their document.</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showRejectInput && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
              <label className="block text-xs font-black text-red-700 uppercase mb-2">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. SNCS Cert is blurry, MOE expiry date doesn't match document..."
                className="w-full border border-red-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none mb-3"
                rows="3"
              ></textarea>
              <div className="flex gap-2">
                <button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-red-700 transition-colors flex-1">Confirm Rejection</button>
                <button onClick={() => setShowRejectInput(false)} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          {!isNewCoach && (
             <button onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
               <Trash2 className="w-4 h-4"/> Delete Staff
             </button>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto ml-auto">
            {!isAdmin && needsVetting && !showRejectInput && (
              <>
                <button onClick={() => setShowRejectInput(true)} className="px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                  <Ban className="w-4 h-4"/> Reject
                </button>
                <button onClick={handleApprove} className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4"/> Approve
                </button>
              </>
            )}
            
            {(!needsVetting || isAdmin || showRejectInput) && (
              <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-teal-600 transition-all shadow-md active:scale-95 w-full sm:w-auto">
                Save Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}