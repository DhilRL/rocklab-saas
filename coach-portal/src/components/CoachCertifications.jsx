import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, ShieldCheck, Info, Eye, Clock, Award, UploadCloud, BadgeCheck, Save, Phone, Camera, User, AlertTriangle, Key } from 'lucide-react';
import { uploadFile, saveCoach, getFileURL, updateUserPassword } from '../firebase/services';
import ImageCropModal from './ImageCropModal';

export default function CoachCertifications({ currentUser, onUpdate, viewMode = 'full' }) {
  const [uploading, setUploading] = useState(null);
  const [localUser, setLocalUser] = useState(currentUser);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLifetimeSncs, setIsLifetimeSncs] = useState(['L1', 'L2', 'L3'].includes(currentUser.sncsLevel || 'L1'));

  // Photo Crop State
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Local state for dates to prevent flickering during re-renders/uploads
  const [dateValues, setDateValues] = useState({
    sncsExpiry: currentUser.sncsExpiry || '',
    moeExpiry: currentUser.moeExpiry || '',
    faExpiry: currentUser.faExpiry || ''
  });

  // Use Refs for absolute focus stability during interaction
  const paynowRef = useRef(null);
  const nicknameRef = useRef(null);
  const passwordRef = useRef(null);
  const sncsLevelRef = useRef(null);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSncsLevelChangeLocal = (e) => {
    setIsLifetimeSncs(['L1', 'L2', 'L3'].includes(e.target.value));
  };

  const handleSync = async () => {
    setSaveStatus('saving');
    
    const newPassword = passwordRef.current?.value || localUser.password;
    const passwordChanged = newPassword !== currentUser.password;
    
    const newNickname = nicknameRef.current?.value || localUser.nickname || '';
    const newPaynow = paynowRef.current?.value || localUser.paynow || '';
    const newSncsLevel = sncsLevelRef.current?.value || localUser.sncsLevel;
    const newSncsExpiry = isLifetimeSncs ? '' : dateValues.sncsExpiry;

    // Check if compliance-related fields have changed
    const complianceChanged = 
      newSncsLevel !== currentUser.sncsLevel ||
      newSncsExpiry !== currentUser.sncsExpiry ||
      dateValues.moeExpiry !== currentUser.moeExpiry ||
      dateValues.faExpiry !== currentUser.faExpiry;

    const updatedData = {
      ...localUser,
      ...dateValues,
      nickname: newNickname,
      paynow: newPaynow,
      password: newPassword,
      sncsLevel: newSncsLevel,
      sncsExpiry: newSncsExpiry,
      // Only set to 'Needs Vetting' if compliance data changed
      status: complianceChanged ? 'Needs Vetting' : (localUser.status || 'Active')
    };

    if (passwordChanged) {
      updatedData.mustChangePassword = false;
    }

    try {
      if (passwordChanged) {
        await updateUserPassword(newPassword);
      }
      Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);
      await saveCoach(updatedData);
      setLocalUser(updatedData);
      onUpdate(updatedData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      alert("Error saving profile: " + error.message);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempPhoto(reader.result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    setIsCropModalOpen(false);
    setUploading('photo');
    
    try {
      const filePath = `coaches/${localUser.id}/avatar_${Date.now()}.jpg`;
      const downloadURL = await uploadFile(filePath, croppedBlob);
      const updatedUser = { ...localUser, photoURL: downloadURL };
      Object.keys(updatedUser).forEach(key => updatedUser[key] === undefined && delete updatedUser[key]);
      await saveCoach(updatedUser);
      setLocalUser(updatedUser);
      onUpdate(updatedUser);
    } catch (error) {
      console.error('Photo upload error:', error);
      alert("Failed to save photo");
    } finally {
      setUploading(null);
      setTempPhoto(null);
    }
  };

  const handleUpload = async (certKey, file) => {
    if (!file) return;
    const uiState = {
        paynow: paynowRef.current?.value || localUser.paynow || '',
        nickname: nicknameRef.current?.value || localUser.nickname || '',
        sncsLevel: sncsLevelRef.current?.value || localUser.sncsLevel,
    };
    setUploading(certKey);
    try {
      const filePath = `coaches/${localUser.id}/${certKey}_${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(filePath, file);
      const updatedUser = {
        ...localUser, ...uiState, ...dateValues,
        certs: { ...localUser.certs, [certKey]: { fileName: file.name, filePath: filePath, downloadURL: downloadURL } },
        status: 'Needs Vetting'
      };
      Object.keys(updatedUser).forEach(key => updatedUser[key] === undefined && delete updatedUser[key]);
      await saveCoach(updatedUser);
      setLocalUser(updatedUser);
      onUpdate(updatedUser);
    } catch (error) {
      console.error('Upload error:', error);
      alert("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const CertBlock = ({ certKey, label, description, expiryField, showExpiry = true }) => {
    const cert = localUser.certs?.[certKey];
    const isImage = cert?.fileName?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
    const isPDF = cert?.fileName?.match(/\.pdf$/i);

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{label}</h3>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
          {showExpiry && (
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3 text-orange-500" /> Expiry Date</label>
              <input type="date" name={expiryField} value={dateValues[expiryField]} onChange={handleDateChange} min="2020-01-01" className="w-full sm:w-40 border border-gray-300 rounded-lg text-xs px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 font-bold text-gray-900" />
            </div>
          )}
        </div>

        {cert && (
          <div className="mt-2 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            {isImage ? (
              <div className="relative group">
                <img src={cert.downloadURL} alt={label} className="w-full h-48 md:h-64 object-contain bg-slate-200 cursor-pointer transition-opacity group-hover:opacity-90" onClick={() => window.open(cert.downloadURL, '_blank')} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 pointer-events-none"><Eye className="w-8 h-8 text-white drop-shadow-lg" /></div>
              </div>
            ) : isPDF ? (
              <div className="w-full h-[400px] md:h-[500px] bg-slate-200/50 relative group">
                <iframe 
                  src={`${cert.downloadURL}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-none shadow-inner"
                  title={label}
                ></iframe>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => window.open(cert.downloadURL, '_blank')}
                    className="bg-white/90 backdrop-blur-sm text-teal-700 p-2 rounded-lg shadow-md hover:bg-white transition-all border border-teal-100"
                    title="Open Fullscreen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500 italic">Preview not available</div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 group">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase">Supporting Document</span>
            {cert ? (
              <div className="flex items-center gap-2 mt-1">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-bold truncate max-w-[150px]">{cert.fileName}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 mt-1 italic">Not uploaded yet</span>
            )}
          </div>
          <div className="flex gap-2">
            <input type="file" id={`upload-${certKey}`} className="hidden" onChange={(e) => handleUpload(certKey, e.target.files[0])} />
            <label htmlFor={`upload-${certKey}`} className={`cursor-pointer px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${uploading === certKey ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600'}`}>
              {uploading === certKey ? 'Uploading...' : <><UploadCloud className="w-3.5 h-3.5" /> {cert ? 'Replace' : 'Upload'}</>}
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-32">
      {viewMode === 'full' && localUser.mustChangePassword && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-800 text-sm font-bold flex items-center gap-4 animate-pulse shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <span>Security Alert: You are using a temporary password. Please change it below to secure your account.</span>
        </div>
      )}

      <div className="bg-teal-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight"><ShieldCheck className="w-8 h-8" /> {viewMode === 'full' ? 'Profile & Payment' : 'Certification Reference'}</h2>
          <p className="text-teal-100 text-sm mt-2 font-medium leading-tight">{viewMode === 'full' ? 'Update your PayNow, Certifications, and Expiry Dates.' : 'View and manage your active certifications and documents.'}</p>
        </div>
        <button onClick={handleSync} disabled={saveStatus === 'saving'} className={`w-full md:w-auto px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-white text-teal-700 hover:bg-teal-50 hover:scale-105'}`}>
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? <><CheckCircle className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </div>

      {viewMode === 'full' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4"><Phone className="w-5 h-5 text-teal-600" /><h3 className="font-black text-gray-900 uppercase tracking-wide">Account & Payment</h3></div>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-3 group">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {uploading === 'photo' ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div> : localUser.photoURL ? <img src={localUser.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-300" />}
                </div>
                <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full shadow-lg cursor-pointer hover:bg-teal-600 transition-all active:scale-90"><Camera className="w-4 h-4" /></label>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Photo</span>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Calendar Nickname</label><input type="text" ref={nicknameRef} defaultValue={localUser.nickname || ''} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 font-bold text-gray-900" placeholder="e.g. Dhil" /></div>
              <div><label className="block text-[10px] font-black text-teal-600 uppercase mb-1">PayNow HP Number</label><input type="text" ref={paynowRef} defaultValue={localUser.paynow || ''} className="w-full border-2 border-teal-100 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-teal-50/30 font-black text-teal-800" placeholder="e.g. 91234567" /></div>
              <div className="sm:col-span-2 pt-2 border-t border-gray-50">
                <label className="block text-[10px] font-black text-teal-600 uppercase mb-1 flex items-center gap-1.5"><Key className="w-3 h-3" /> Change Login Password</label>
                <input type="text" ref={passwordRef} defaultValue={localUser.password || ''} className="w-full border-2 border-teal-100 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-teal-50/10 font-mono font-bold text-teal-900" placeholder="Set a new password" />
                <p className="text-[10px] text-gray-400 mt-1 italic">Updating this will change your login password immediately.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-slate-50/50"><Award className="w-5 h-5 text-teal-600" /><h3 className="font-black text-gray-900 uppercase tracking-wide">Qualifications & Documents</h3></div>
        <div className="p-6 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
            <div className="flex items-center gap-4"><div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Award className="w-6 h-6" /></div><div><h3 className="font-bold text-gray-900 uppercase tracking-tight text-sm">Climbing Qualification</h3><p className="text-[10px] text-gray-500 font-medium">Select your highest attained level</p></div></div>
            <select ref={sncsLevelRef} defaultValue={localUser.sncsLevel || 'L1'} onChange={handleSncsLevelChangeLocal} className="w-full sm:w-64 border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-black bg-white text-blue-800 focus:border-teal-500 outline-none transition-all shadow-sm">
              <option value="L1">SNCS Level 1</option><option value="L2">SNCS Level 2</option><option value="L3">SNCS Level 3</option><option value="WS">Wall Supervisor</option><option value="Cat1">SSCMF Category 1</option><option value="Cat2">SSCMF Category 2</option>
            </select>
          </div>
          <div className="space-y-6">
            <CertBlock certKey="sncs" label="SNCS Certificate" description="Your official level certificate" expiryField="sncsExpiry" showExpiry={!isLifetimeSncs} />
            <CertBlock certKey="moe" label="MOE Registration" description="Ministry of Education (IRS) slip" expiryField="moeExpiry" />
            <CertBlock certKey="firstAid" label="First Aid Certificate" description="Standard First Aid + AED" expiryField="faExpiry" />
          </div>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
        <div className="text-xs text-orange-800 font-medium leading-relaxed"><strong>Important Note:</strong> After updating dates or selecting your level, you <u>must</u> click <strong>Save Changes</strong> at the top.</div>
      </div>
      {isCropModalOpen && <ImageCropModal image={tempPhoto} onCropComplete={handleCropComplete} onCancel={() => { setIsCropModalOpen(false); setTempPhoto(null); }} />}
    </div>
  );
}