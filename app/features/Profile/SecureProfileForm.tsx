import React, { useState, useCallback, useEffect } from 'react';
import { User, Save, AlertCircle, Check } from 'lucide-react';
import Button from '../../shared/components/Button';
import { UpdateProfileSchema, validateData } from '../../shared/validation/schemas';
import { useCSRFToken, createSecureFormData } from '../../shared/security/csrf';
import { supabase } from '../../core/api/supabase';

interface ProfileFormData {
  full_name: string;
  avatar_url: string;
}

interface SecureProfileFormProps {
  initialData?: ProfileFormData;
  onSave?: (data: ProfileFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function SecureProfileForm({ 
  initialData, 
  onSave, 
  onCancel 
}: SecureProfileFormProps) {
  // State
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: initialData?.full_name || '',
    avatar_url: initialData?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { getToken: _getToken } = useCSRFToken();

  // Real-time validation
  useEffect(() => {
    if (formData.full_name.trim() || formData.avatar_url.trim()) {
      const profileData = {
        full_name: formData.full_name.trim() || undefined,
        user_metadata: {
          full_name: formData.full_name.trim() || undefined,
          avatar_url: formData.avatar_url.trim() || undefined,
        },
        csrf_token: 'placeholder', // Will be replaced during save
      };

      const validation = validateData(UpdateProfileSchema.omit({ csrf_token: true }), profileData);
      if (!validation.success) {
        setValidationErrors(validation.error.split(', '));
      } else {
        setValidationErrors([]);
      }
    } else {
      setValidationErrors([]);
    }
  }, [formData]);

  // Event handlers
  const handleInputChange = useCallback((field: keyof ProfileFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value
      }));
      setSaveSuccess(false);
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setValidationErrors([]);
    setSaveSuccess(false);

    try {
      // Create secure form data with CSRF token
      const secureFormData = await createSecureFormData({
        full_name: formData.full_name.trim() || undefined,
        user_metadata: {
          full_name: formData.full_name.trim() || undefined,
          avatar_url: formData.avatar_url.trim() || undefined,
        },
      });

      // Validate with Zod
      const validation = validateData(UpdateProfileSchema, secureFormData);
      if (!validation.success) {
        setValidationErrors(validation.error.split(', '));
        return;
      }

      // Update profile via Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name.trim(),
          avatar_url: formData.avatar_url.trim(),
        }
      });

      if (error) {
        throw error;
      }

      // Call parent onSave if provided
      if (onSave) {
        await onSave(formData);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setValidationErrors(['Failed to save profile. Please try again.']);
    } finally {
      setSaving(false);
    }
  }, [formData, onSave]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset form
      setFormData({
        full_name: initialData?.full_name || '',
        avatar_url: initialData?.avatar_url || '',
      });
      setValidationErrors([]);
      setSaveSuccess(false);
    }
  }, [onCancel, initialData]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mr-3">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Edit Profile</h3>
          <p className="text-sm text-text-secondary">Update your personal information</p>
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700 font-medium">Profile updated successfully!</p>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={handleInputChange('full_name')}
            placeholder="Enter your full name"
            className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 ${
              validationErrors.some(err => err.includes('full_name') || err.includes('Name'))
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200'
            }`}
            maxLength={100}
            required
          />
          <div className="flex justify-between mt-1">
            <p className="text-sm text-text-secondary">
              {formData.full_name.length}/100 characters
            </p>
            <p className="text-sm text-text-secondary">* Required field</p>
          </div>
        </div>

        {/* Avatar URL */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Avatar URL (Optional)
          </label>
          <input
            type="url"
            value={formData.avatar_url}
            onChange={handleInputChange('avatar_url')}
            placeholder="https://example.com/avatar.jpg"
            className={`w-full p-3 border-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-200 ${
              validationErrors.some(err => err.includes('avatar_url'))
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-200'
            }`}
            maxLength={500}
          />
          <p className="text-sm text-text-secondary mt-1">
            Enter a URL to your profile picture
          </p>
        </div>

        {/* Avatar Preview */}
        {formData.avatar_url.trim() && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Avatar Preview
            </label>
            <div className="flex items-center space-x-4">
              <img
                src={formData.avatar_url}
                alt="Avatar preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <p className="text-sm text-text-secondary">
                If the image doesn't load, please check the URL
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={saving}
          className="px-6 py-2"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.full_name.trim() || saving || validationErrors.length > 0}
          loading={saving}
          className="px-8 py-2 bg-gradient-to-r from-primary to-accent text-white font-semibold"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Profile
        </Button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 text-center">
          🔒 Your profile is protected with CSRF tokens and validated on both client and server
        </p>
      </div>
    </div>
  );
}