import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../App';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Name State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updatingName, setUpdatingName] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile Pic State
  const [picFile, setPicFile] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!fullName) return;
    setUpdatingName(true);
    try {
      const res = await api.put('/users/me', { full_name: fullName });
      updateUser(res.data);
      showToast("Profile name updated successfully!");
    } catch (err) {
      showToast("Failed to update profile name.", "error");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      showToast("Please fill out all fields.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Confirm passwords do not match.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      showToast("Password updated successfully!");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.detail || "Password change failed.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUploadPic = async (e) => {
    e.preventDefault();
    if (!picFile) {
      showToast("Please select an image file first.", "error");
      return;
    }

    setUploadingPic(true);
    const formData = new FormData();
    formData.append("file", picFile);

    try {
      const res = await api.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(res.data);
      showToast("Profile picture updated!");
      setPicFile(null);
      document.getElementById("profile-pic-input").value = "";
    } catch (err) {
      showToast(err.response?.data?.detail || "Image upload failed.", "error");
    } finally {
      setUploadingPic(false);
    }
  };



  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Col 1: Profile Summary Card & Photo Upload */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 text-center">
          <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">My Profile</h4>
          
          {/* Avatar Rendering */}
          <div className="flex justify-center mb-4">
            {user?.profile_picture ? (
              <img
                src={`http://localhost:8000${user.profile_picture}`}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-3xl dark:bg-blue-900/60 dark:text-blue-200 border-2 border-blue-200">
                {(user?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <h3 className="font-extrabold text-lg text-gray-800 dark:text-white">{user?.full_name || 'Finance User'}</h3>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
          <p className="text-[10px] text-gray-400 mt-2">Member since: {user ? new Date(user.created_at).toLocaleDateString() : ''}</p>
          
          {/* Upload photo form */}
          <form onSubmit={handleUploadPic} className="mt-6 border-t border-gray-100 pt-4 text-xs space-y-3 dark:border-gray-700">
            <div className="text-left">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Update profile image</label>
              <input
                id="profile-pic-input"
                type="file"
                accept="image/*"
                onChange={(e) => setPicFile(e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 dark:border-gray-700 rounded p-0.5"
              />
            </div>
            <button
              type="submit"
              disabled={uploadingPic}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50 transition-colors"
            >
              {uploadingPic ? "Uploading..." : "Save Image"}
            </button>
          </form>
        </div>
      </div>

      {/* Col 2: Settings Form Cards */}
      <div className="space-y-6 lg:col-span-2">
        
        {/* Name Update Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Personal Details</h4>
          <form onSubmit={handleUpdateName} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={updatingName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50 transition-colors"
            >
              {updatingName ? "Saving..." : "Save Profile Details"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Security Credentials</h4>
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-500 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-bold text-gray-500 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50 transition-colors"
            >
              {updatingPassword ? "Updating..." : "Update Security Password"}
            </button>
          </form>
        </div>



      </div>

    </div>
  );
}
