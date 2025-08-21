import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  Users, 
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  X,
  Hash,
  BarChart3,
  Mail,
  Lock
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsSuperAdmin, canEditProject } from '../lib/authz';
import { Project } from '../types';
import { formatMYR } from '../utils/currency';
import { formatDate } from '../utils/date';
import ProjectModal from './ProjectModal';
import ProjectBudgetBreakdown from './ProjectBudgetBreakdown';
import ProjectDetailModal from './ProjectDetailModal';
import EmailModal from './EmailModal';

const ProjectsView = () => {
  const { projects, users, budgetCodes, budgetEntries, deleteProject, updateProject, divisions, units } = useApp();
  const { user: currentUser, profile } = useAuth();
  const { allowed: isSA } = useIsSuperAdmin();
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState<Project | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState<Project | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<Project | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'planning':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'on_hold':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'planning':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'on_hold':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBudgetStatus = (budget: number, spent: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowModal(true);
  };

  // ✨ NEW: Handle adding current user to project
  const handleAddMe = async (project: Project) => {
    if (!currentUser?.id) return;
    
    try {
      // Add current user to project's assigned users
      const updatedAssignedUsers = [...project.assignedUsers, currentUser.id];
      
      // Update project via AppContext
      await updateProject(project.id, {
        assignedUsers: updatedAssignedUsers
      });
      
      // Show success feedback (you can add toast here if available)
      console.log(`[ProjectsView] Successfully added ${currentUser.id} to project ${project.id}`);
      
    } catch (error) {
      console.error('[ProjectsView] Failed to add user to project:', error);
      // You can add error toast here if available
    }
  };

  const handleDelete = (project: Project) => {
    const canDelete = !!isSA;
    if (!canDelete) return;
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteProject(project.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleViewDetails = (project: Project) => {
    setShowProjectDetail(project);
  };

  const handleViewBudgetBreakdown = (project: Project) => {
    setShowBudgetBreakdown(project);
  };

  const handleSendEmail = (project: Project) => {
    setShowEmailModal(project);
  };

  const getAssignedUserNames = (userIds: string[]) => {
    return userIds
      .map(id => users.find(user => user.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getBudgetCodeNames = (codeIds: string[]) => {
    return codeIds
      .map(id => budgetCodes.find(code => code.id === id)?.code)
      .filter(Boolean);
  };

  const getProjectBudgetEntries = (projectId: string) => {
    return budgetEntries.filter(entry => entry.projectId === projectId);
  };

  const filteredUnits = selectedDivision === 'all' ? units : units.filter(u => u.divisionId === selectedDivision);
  const filteredProjectsTop = projects.filter(p =>
    (selectedDivision === 'all' || filteredUnits.some(u => u.id === p.unitId)) &&
    (selectedUnit === 'all' || p.unitId === selectedUnit)
  );

  return (
    <div className="w-full h-full">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Projects ({filteredProjectsTop.length})
            </h2>
            <div className="flex items-center space-x-2">
              <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setSelectedUnit('all'); }}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Divisions</option>
                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Units</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {filteredProjectsTop.map((project) => {
            const budgetPercentage = (project.spent / project.budget) * 100;
            const projectBudgetCodes = getBudgetCodeNames(project.budgetCodes || []);
            
            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6 hover:shadow-lg transition-all duration-200 group cursor-pointer"
                onClick={() => handleViewDetails(project)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    {/* ✨ NEW: Lock Badge for non-editable projects */}
                    {!canEditProject(project, { id: currentUser?.id || '', role: profile?.role }) && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </div>
                    )}
                    
                    {/* ✨ NEW: Add Me button for admins/super_admins on unassigned projects */}
                    {(profile?.role === 'admin' || profile?.role === 'super_admin') && 
                     !project.assignedUsers.includes(currentUser?.id || '') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddMe(project);
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                        title="Add me to this project"
                      >
                        Add Me
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendEmail(project);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                      title="Send Email Report"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewBudgetBreakdown(project);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400"
                      title="View Budget Breakdown"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(project);
                      }}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(project);
                      }}
                      className={`p-1 ${
                        canEditProject(project, { id: currentUser?.id || '', role: profile?.role })
                          ? 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      title={
                        canEditProject(project, { id: currentUser?.id || '', role: profile?.role })
                          ? 'Edit Project'
                          : "You're not assigned. Ask an admin to add you, or click Add me."
                      }
                      disabled={!canEditProject(project, { id: currentUser?.id || '', role: profile?.role })}
                    >
                      <Edit3 className="h-4 w-4" />
                      {import.meta.env.DEV && (
                        <span 
                          aria-hidden="true" 
                          data-edit-guard={canEditProject(project, { id: currentUser?.id || '', role: profile?.role }) ? 'allowed' : 'blocked'}
                          className="hidden"
                        />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project);
                      }}
                      className={`p-1 ${isSA ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                      title="Delete Project"
                      disabled={!isSA}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status and Priority */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(project.status)}
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`text-sm font-medium capitalize ${getPriorityColor(project.priority)}`}>
                    {project.priority} Priority
                  </span>
                </div>

                {/* Budget Codes */}
                {projectBudgetCodes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Hash className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Codes</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {projectBudgetCodes.slice(0, 2).map((code, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded"
                        >
                          {code}
                        </span>
                      ))}
                      {projectBudgetCodes.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          +{projectBudgetCodes.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Budget Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget</span>
                    <span className={`text-sm font-medium ${getBudgetStatus(project.budget, project.spent)}`}>
                      {formatMYR(project.spent)} / {formatMYR(project.budget)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        budgetPercentage >= 90 
                          ? 'bg-red-500' 
                          : budgetPercentage >= 75 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{formatDate(project.startDate, 'DD/MM/YYYY')} - {formatDate(project.endDate, 'DD/MM/YYYY')}</span>
                  </div>
                  
                  {project.assignedUsers.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getAssignedUserNames(project.assignedUsers)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first project</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showModal && (
        <ProjectModal
          project={editingProject}
          onClose={handleCloseModal}
        />
      )}

      {/* Project Detail Modal */}
      {showProjectDetail && (
        <ProjectDetailModal
          project={showProjectDetail}
          onClose={() => setShowProjectDetail(null)}
        />
      )}

      {/* Budget Breakdown Modal */}
      {showBudgetBreakdown && (
        <ProjectBudgetBreakdown
          project={showBudgetBreakdown}
          onClose={() => setShowBudgetBreakdown(null)}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          project={showEmailModal}
          budgetEntries={getProjectBudgetEntries(showEmailModal.id)}
          onClose={() => setShowEmailModal(null)}
        />
      )}
    </div>
  );
};

export default ProjectsView;