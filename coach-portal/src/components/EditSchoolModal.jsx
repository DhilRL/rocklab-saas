import React, { useState } from 'react';
import { X, Upload, BadgeCheck, Trash2, Hash } from 'lucide-react';

export default function EditSchoolModal({ editingSchool, setEditingSchool, handleSaveSchoolEdit, handleDeleteSchool, schools = [] }) {
  if (!editingSchool) return null;
  
  const [formData, setFormData] = useState({ ...editingSchool });
  const isNew = formData.id?.toString().startsWith('new_sch');

  const handleTextChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    
    if (name === 'schoolCode') {
        finalValue = value.toUpperCase().substring(0, 4).replace(/[^A-Z0-9]/g, '');
    }

    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(finalValue) : finalValue }));
  };

  const handleSopUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, sop: file.name }));
    }
  };

  const handleSave = () => {
    if (!formData.name) { alert("Please enter a School Name"); return; }
    if (!formData.schoolCode || formData.schoolCode.length < 2) { 
        alert("Please enter a unique School Code (2-4 characters)"); 
        return; 
    }

    // Unique check
    const isCodeTaken = schools.some(s => s.id !== formData.id && s.schoolCode === formData.schoolCode);
    if (isCodeTaken) {
        alert(`The code "${formData.schoolCode}" is already taken by another school. Please choose a unique code.`);
        return;
    }

    handleSaveSchoolEdit(formData);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you absolutely sure you want to delete ${formData.name}? This will remove the school profile permanently.`)) {
      handleDeleteSchool(formData.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 text-white flex justify-between items-center bg-slate-800 shrink-0">
          <h3 className="font-bold text-lg">{isNew ? 'Add New School' : 'Edit School Profile'}</h3>
          <button onClick={() => setEditingSchool(null)} className="text-white/80 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Hash className="w-4 h-4 text-teal-600" /> Administrative Setup
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">School / Venue Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleTextChange} placeholder="e.g. Hougang Secondary" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-teal-600 mb-1 uppercase tracking-wider">Unique School Code</label>
                <input type="text" name="schoolCode" value={formData.schoolCode || ''} onChange={handleTextChange} placeholder="e.g. HGSS" className="w-full border-2 border-teal-100 bg-teal-50/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-black text-teal-800" />
                <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Max 4 chars (Unique)</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Address</label>
              <textarea name="address" rows="2" value={formData.address} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Billing Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">Client Billing Rates</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Lead Coach Rate ($/hr)</label>
                <input type="number" name="leadRate" min="0" value={formData.leadRate} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-emerald-600 bg-emerald-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Assist Coach Rate ($/hr)</label>
                <input type="number" name="assistRate" min="0" value={formData.assistRate} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-emerald-600 bg-emerald-50" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">Default Session Timing</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Default Start Time</label>
                <input type="time" name="defaultStartTime" value={formData.defaultStartTime || '14:00'} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Default End Time</label>
                <input type="time" name="defaultEndTime" value={formData.defaultEndTime || '16:00'} onChange={handleTextChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 border-b pb-2">Standard Operating Procedures (SOP)</h4>
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">Facility SOP Document</span>
                {formData.sop ? (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5"><BadgeCheck className="w-3 h-3"/> Uploaded: {formData.sop}</span>
                ) : (
                  <span className="text-xs text-gray-400 mt-0.5">No file uploaded. Coaches won't see an SOP link.</span>
                )}
              </div>
              <div className="relative">
                <input type="file" id="sop-upload" accept="image/png, image/jpeg, image/jpg, application/pdf" className="hidden" onChange={handleSopUpload} />
                <label htmlFor="sop-upload" className="cursor-pointer bg-white border border-gray-300 hover:border-teal-500 hover:bg-teal-50 text-gray-600 hover:text-teal-600 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 shadow-sm">
                  <Upload className="w-3.5 h-3.5" /> {formData.sop ? 'Replace' : 'Upload'}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 flex gap-3">
          {!isNew && (
            <button onClick={handleDelete} title="Delete School" className="px-4 py-3 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center shadow-sm">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={handleSave} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition-colors shadow-md uppercase tracking-widest text-sm">
            Save School Profile
          </button>
        </div>
      </div>
    </div>
  );
}