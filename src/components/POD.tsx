import React, { useState } from 'react';
import { Upload, Search, FileImage, Download } from 'lucide-react';

const PODComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">POD (Proof of Delivery)</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload POD</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Bill No, Vehicle No, Party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Search
          </button>
        </div>
      </div>

      {/* POD Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">POD Images</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No POD images found</p>
            <p className="text-sm">Upload POD images to attach with bills</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PODComponent;