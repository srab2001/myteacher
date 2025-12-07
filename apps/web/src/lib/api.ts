const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'TEACHER' | 'CASE_MANAGER' | 'ADMIN' | null;
  stateCode: string | null;
  districtName: string | null;
  schoolName: string | null;
  isOnboarded: boolean;
}

export interface StudentStatus {
  id: string;
  scope: 'OVERALL' | 'ACADEMIC' | 'BEHAVIOR' | 'SERVICES';
  code: 'ON_TRACK' | 'WATCH' | 'CONCERN' | 'URGENT';
  summary: string | null;
  effectiveDate: string;
  updatedBy?: { displayName: string };
}

export interface Student {
  id: string;
  studentIdNum: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName: string;
  dateOfBirth?: string;
  overallStatus: StudentStatus | null;
  statuses: StudentStatus[];
  plans?: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string | null;
    status: string;
  }>;
}

export interface State {
  stateCode: string;
  stateName: string;
  districts: Array<{ code: string; name: string }>;
}

class ApiClient {
  private async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(username: string, password: string): Promise<{ user: User }> {
    return this.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.fetch('/auth/me');
  }

  async logout(): Promise<void> {
    await this.fetch('/auth/logout', { method: 'POST' });
  }

  async updateProfile(data: {
    role: string;
    stateCode: string;
    districtName: string;
    schoolName: string;
  }): Promise<{ user: User }> {
    return this.fetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getJurisdictions(): Promise<{ states: State[] }> {
    return this.fetch('/api/user/jurisdictions');
  }

  async getStudents(): Promise<{ students: Student[] }> {
    return this.fetch('/api/students');
  }

  async getStudent(id: string): Promise<{ student: Student }> {
    return this.fetch(`/api/students/${id}`);
  }

  async getStudentStatus(id: string): Promise<{ current: StudentStatus[]; history: StudentStatus[] }> {
    return this.fetch(`/api/students/${id}/status`);
  }

  async createStudentStatus(
    studentId: string,
    data: {
      scope: string;
      code: string;
      summary?: string;
      effectiveDate: string;
    }
  ): Promise<{ status: StudentStatus }> {
    return this.fetch(`/api/students/${studentId}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
