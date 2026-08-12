import React, { useState, useRef } from 'react';
import { X, BadgeCheck, Image as ImageIcon, UploadCloud, Calendar as CalendarIcon, Award, Clock, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { uploadFile, saveCoach, getFileURL, updateUserPassword } from '../firebase/services';

export default function CoachProfileModal({ isOpen, setIsOpen, currentUser, handleSaveCoachEdit }) {
  if (!isOpen) return null;

  const [uploading, setUploading] = useState(null);
  const [localUser, setLocalUser] = useState(currentUser);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLifetimeSncs, setIsLifetimeSncs] = useState(['L1', 'L2', 'L3'].includes(currentUser.sncsLevel || 'L1'));

  // Use Refs for absolute stability while picking dates or typing
  const nicknameRef = useRef(null);
  const paynowRef = useRef(null);
  const passwordRef = useRef(null);
  const sncsLevelRef = useRef(null);
  const sncsExpiryRef = useRef(null);
  const moeExpiryRef = useRef(null);
  const faExpiryRef = useRef(null);

  const handleSncsLevelChangeLocal = (e) => {
    setIsLifetimeSncs(['L1', 'L2', 'L3'].includes(e.target.value));
  };

  const handleSync = async () => {
    setSaveStatus('saving');
    
    const newPassword = passwordRef.current?.value || localUser.password;
    const passwordChanged = newPassword !== currentUser.password;
    
    const newNickname = nicknameRef.current?.value || localUser.nickname;
    const newPaynow = paynowRef.current?.value || localUser.paynow;
    const newSncsLevel = sncsLevelRef.current?.value || localUser.sncsLevel;
    const newSncsExpiry = isLifetimeSncs ? '' : (sncsExpiryRef.current?.value || localUser.sncsExpiry);
    const newMoeExpiry = moeExpiryRef.current?.value || localUser.moeExpiry;
    const newFaExpiry = faExpiryRef.current?.value || localUser.faExpiry;

    // Check if compliance-related fields have changed
    const complianceChanged = 
      newSncsLevel !== currentUser.sncsLevel ||
      newSncsExpiry !== currentUser.sncsExpiry ||
      newMoeExpiry !== currentUser.moeExpiry ||
      newFaExpiry !== currentUser.faExpiry;

    // Gather all current values from refs
    const updatedData = {
      ...localUser,
      nickname: newNickname,
      paynow: newPaynow,
      password: newPassword,
      sncsLevel: newSncsLevel,
      sncsExpiry: newSncsExpiry,
      moeExpiry: newMoeExpiry,
      faExpiry: newFaExpiry,
      // Only set to 'Needs Vetting' if compliance data changed
      status: complianceChanged ? 'Needs Vetting' : (localUser.status || 'Active')
    };

    if (passwordChanged) {
      updatedData.mustChangePassword = false;
    }

    try {
      // 1. Update Firebase Auth password if changed
      if (passwordChanged) {
        await updateUserPassword(newPassword);
      }

      // 2. Save to Firestore
      // Sanitize: Remove undefined values which Firestore doesn't support
      Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);
      
      await saveCoach(updatedData);
      setLocalUser(updatedData);
      handleSaveCoachEdit(updatedData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      alert("Error saving profile: " + error.message);
    }
  };

  const handleCertUpload = async (certKey, file) => {
    if (!file) return;

    // Capture current UI state before upload so dates aren't lost
    const currentUIValues = {
        nickname: nicknameRef.current?.value || localUser.nickname,
        paynow: paynowRef.current?.value || localUser.paynow,
        password: passwordRef.current?.value || localUser.password,
        sncsLevel: sncsLevelRef.current?.value || localUser.sncsLevel,
        sncsExpiry: isLifetimeSncs ? '' : (sncsExpiryRef.current?.value || localUser.sncsExpiry),
        moeExpiry: moeExpiryRef.current?.value || localUser.moeExpiry,
        faExpiry: faExpiryRef.current?.value || localUser.faExpiry
    };

    setUploading(certKey);
    
    try {
      const filePath = `coaches/${localUser.id}/${certKey}_${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(filePath, file);
      
      const updatedUser = {
        ...localUser,
        ...currentUIValues,
        certs: {
          ...localUser.certs,
          [certKey]: { fileName: file.name, filePath: filePath, downloadURL: downloadURL }
        },
        status: 'Needs Vetting'
      };

      // Sanitize
      Object.keys(updatedUser).forEach(key => updatedUser[key] === undefined && delete updatedUser[key]);
      
      await saveCoach(updatedUser);
      setLocalUser(updatedUser);
      handleSaveCoachEdit(updatedUser);
    } catch (error) {
      console.error('Upload error:', error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 text-white flex justify-between items-center bg-slate-800 shrink-0">
          <h3 className="font-bold text-lg">Update Profile & Certifications</h3>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-8">
          {localUser.mustChangePassword && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm font-bold flex items-center gap-3 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Security: Please change your temporary password to a permanent one to continue.</span>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-sm font-medium">
            Please ensure your <strong>PayNow HP</strong> and certificates are up to date. Click <span className="underline font-bold italic">Save Changes</span> when finished.
          </div>

          {/* Section 1: Account & Payment */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wider text-xs">
              <ImageIcon className="w-4 h-4 text-teal-600" /> Account & Payment Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">CALENDAR NICKNAME</label>
                <input type="text" ref={nicknameRef} defaultValue={localUser.nickname || ''} placeholder="e.g. Dhil" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 text-teal-600">PAYNOW HP NUMBER (MOBILE)</label>
                <input type="text" ref={paynowRef} defaultValue={localUser.paynow || ''} placeholder="e.g. 91234567" className="w-full border border-teal-200 bg-teal-50/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-teal-600 uppercase mb-1">CHANGE LOGIN PASSWORD</label>
                <input type="text" ref={passwordRef} defaultValue={localUser.password || ''} placeholder="Type new password here" className="w-full border border-teal-200 bg-teal-50/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono font-bold" />
                <p className="text-[10px] text-gray-400 mt-1 italic">Updating this will change your login password immediately.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Qualifications & Documents */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wider text-xs">
              <Award className="w-4 h-4 text-teal-600" /> Qualifications & Documents
            </h4>

            {/* Consolidated Qualifications Container */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 space-y-8">
              
              {/* SNCS BLOCK */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">SNCS HIGHEST LEVEL</label>
                    <select ref={sncsLevelRef} defaultValue={localUser.sncsLevel || 'L1'} onChange={handleSncsLevelChangeLocal} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-bold text-teal-700">
                      <option value="L1">SNCS Level 1</option>
                      <option value="L2">SNCS Level 2</option>
                      <option value="L3">SNCS Level 3</option>
                      <option value="WS">Wall Supervisor</option>
                      <option value="Cat1">SSCMF Category 1</option>
                      <option value="Cat2">SSCMF Category 2</option>
                    </select>
                  </div>
                  {!isLifetimeSncs && (
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3 text-orange-500" /> SNCS Expiry Date</label>
                      <input type="date" ref={sncsExpiryRef} defaultValue={localUser.sncsExpiry || ''} min="2020-01-01" className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg group">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">SNCS Cert Document</span>
                    {localUser.certs?.sncs ? (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-medium"><BadgeCheck className="w-3 h-3"/> {typeof localUser.certs.sncs === 'object' ? localUser.certs.sncs.fileName : localUser.certs.sncs}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-0.5 italic">No file uploaded</span>
                    )}
                  </div>
                  <input type="file" id="modal-cert-sncs" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleCertUpload('sncs', e.target.files[0])} />
                  <label htmlFor="modal-cert-sncs" className={`cursor-pointer px-3 py-2 rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider text-[10px] font-black ${uploading === 'sncs' ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 border border-slate-300 hover:border-teal-500 text-gray-600 hover:text-teal-600'}`}>
                    <UploadCloud className="w-3.5 h-3.5" /> {uploading === 'sncs' ? 'Saving...' : localUser.certs?.sncs ? 'REPLACE' : 'UPLOAD'}
                  </label>
                </div>
              </div>

              {/* MOE BLOCK */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3 text-orange-500" /> MOE Registration Expiry</label>
                  <input type="date" ref={moeExpiryRef} defaultValue={localUser.moeExpiry || ''} min="2020-01-01" className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">MOE Cert/Slip</span>
                    {localUser.certs?.moe ? (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-medium"><BadgeCheck className="w-3 h-3"/> {typeof localUser.certs.moe === 'object' ? localUser.certs.moe.fileName : localUser.certs.moe}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-0.5 italic">No file uploaded</span>
                    )}
                  </div>
                  <input type="file" id="modal-cert-moe" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleCertUpload('moe', e.target.files[0])} />
                  <label htmlFor="modal-cert-moe" className={`cursor-pointer px-3 py-2 rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider text-[10px] font-black ${uploading === 'moe' ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 border border-slate-300 hover:border-teal-500 text-gray-600 hover:text-teal-600'}`}>
                    <UploadCloud className="w-3.5 h-3.5" /> {uploading === 'moe' ? 'Saving...' : localUser.certs?.moe ? 'REPLACE' : 'UPLOAD'}
                  </label>
                </div>
              </div>

              {/* FIRST AID BLOCK */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="w-full">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3 text-orange-500" /> First Aid Expiry Date</label>
                  <input type="date" ref={faExpiryRef} defaultValue={localUser.faExpiry || ''} min="2020-01-01" className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">First Aid Cert</span>
                    {localUser.certs?.firstAid ? (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-medium"><BadgeCheck className="w-3 h-3"/> {typeof localUser.certs.firstAid === 'object' ? localUser.certs.firstAid.fileName : localUser.certs.firstAid}</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-0.5 italic">No file uploaded</span>
                    )}
                  </div>
                  <input type="file" id="modal-cert-firstAid" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleCertUpload('firstAid', e.target.files[0])} />
                  <label htmlFor="modal-cert-firstAid" className={`cursor-pointer px-3 py-2 rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider text-[10px] font-black ${uploading === 'firstAid' ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 border border-slate-300 hover:border-teal-500 text-gray-600 hover:text-teal-600'}`}>
                    <UploadCloud className="w-3.5 h-3.5" /> {uploading === 'firstAid' ? 'Saving...' : localUser.certs?.firstAid ? 'REPLACE' : 'UPLOAD'}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 flex gap-3">
          <button onClick={() => setIsOpen(false)} className="px-6 py-4 text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handleSync} disabled={saveStatus === 'saving'} className={`flex-1 font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${saveStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? <><CheckCircle className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}