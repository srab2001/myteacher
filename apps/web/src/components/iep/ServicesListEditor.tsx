'use client';

import { useState } from 'react';

export interface ServiceItem {
  serviceType: string;
  frequency: string;
  duration: string;
  location: string;
  startDate?: string;
  endDate?: string;
}

interface ServicesListEditorProps {
  value: ServiceItem[];
  onChange: (value: ServiceItem[]) => void;
  label: string;
  required?: boolean;
}

const emptyService: ServiceItem = {
  serviceType: '',
  frequency: '',
  duration: '',
  location: '',
  startDate: '',
  endDate: '',
};

export function ServicesListEditor({
  value = [],
  onChange,
  label,
  required = false,
}: ServicesListEditorProps) {
  const [services, setServices] = useState<ServiceItem[]>(
    value.length > 0 ? value : []
  );

  const updateServices = (newServices: ServiceItem[]) => {
    setServices(newServices);
    onChange(newServices);
  };

  const handleAddService = () => {
    updateServices([...services, { ...emptyService }]);
  };

  const handleRemoveService = (index: number) => {
    const newServices = services.filter((_, i) => i !== index);
    updateServices(newServices);
  };

  const handleFieldChange = (index: number, field: keyof ServiceItem, value: string) => {
    const newServices = services.map((service, i) =>
      i === index ? { ...service, [field]: value } : service
    );
    updateServices(newServices);
  };

  return (
    <div className="services-list-editor">
      <div className="services-header">
        <label className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
        <button
          type="button"
          className="add-service-btn"
          onClick={handleAddService}
        >
          + Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="no-services">
          <p>No services added yet. Click "Add Service" to begin.</p>
        </div>
      ) : (
        <div className="services-table-container">
          <table className="services-table">
            <thead>
              <tr>
                <th>Service Type</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Location</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="service-input"
                      value={service.serviceType}
                      onChange={(e) => handleFieldChange(index, 'serviceType', e.target.value)}
                      placeholder="e.g., Reading Support"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="service-input"
                      value={service.frequency}
                      onChange={(e) => handleFieldChange(index, 'frequency', e.target.value)}
                      placeholder="e.g., 3x/week"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="service-input"
                      value={service.duration}
                      onChange={(e) => handleFieldChange(index, 'duration', e.target.value)}
                      placeholder="e.g., 30 min"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="service-input"
                      value={service.location}
                      onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
                      placeholder="e.g., Resource Room"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="service-input date-input"
                      value={service.startDate || ''}
                      onChange={(e) => handleFieldChange(index, 'startDate', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="service-input date-input"
                      value={service.endDate || ''}
                      onChange={(e) => handleFieldChange(index, 'endDate', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveService(index)}
                      title="Remove service"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .services-list-editor {
          width: 100%;
          margin-bottom: 1.5rem;
        }

        .services-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .services-header .form-label {
          margin: 0;
          font-weight: 500;
        }

        .required-mark {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .add-service-btn {
          padding: 0.375rem 0.75rem;
          background: var(--primary, #6366f1);
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .add-service-btn:hover {
          background: var(--primary-dark, #4f46e5);
        }

        .no-services {
          padding: 2rem;
          text-align: center;
          background: var(--background, #f9fafb);
          border: 1px dashed var(--border, #e5e7eb);
          border-radius: 0.5rem;
          color: var(--muted, #6b7280);
        }

        .no-services p {
          margin: 0;
        }

        .services-table-container {
          overflow-x: auto;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 0.5rem;
        }

        .services-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        .services-table th,
        .services-table td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .services-table th {
          background: var(--background, #f9fafb);
          font-weight: 500;
          font-size: 0.75rem;
          color: var(--muted, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .services-table tbody tr:last-child td {
          border-bottom: none;
        }

        .services-table tbody tr:hover {
          background: var(--background, #f9fafb);
        }

        .service-input {
          width: 100%;
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 0.25rem;
          font-size: 0.8125rem;
        }

        .service-input:focus {
          outline: none;
          border-color: var(--primary, #6366f1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        .date-input {
          min-width: 120px;
        }

        .remove-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--muted, #6b7280);
          font-size: 1.25rem;
          cursor: pointer;
          transition: color 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-btn:hover {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
