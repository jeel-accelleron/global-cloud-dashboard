"""
URL configuration for workitems app
"""
from django.urls import path
from .views import (
    WorkItemListView,
    WorkItemByIdsView,
    WorkItemSearchView,
    WorkItemUpdatedSinceView,
    CustomWIQLQueryView,
    WorkItemHierarchyView,
    health_check,
    team_info,
    project_activity,
    copilot_chat,
    copilot_chat_stream,
    clear_chat_session
)

app_name = 'workitems'

urlpatterns = [
    # Health check
    path('health/', health_check, name='health-check'),

    # Team info
    path('team/', team_info, name='team-info'),

    # Project activity
    path('projects/activity/', project_activity, name='project-activity'),
    
    # Work item endpoints
    path('', WorkItemListView.as_view(), name='work-item-list'),
    path('by-ids/', WorkItemByIdsView.as_view(), name='work-item-by-ids'),
    path('search/', WorkItemSearchView.as_view(), name='work-item-search'),
    path('updated-since/', WorkItemUpdatedSinceView.as_view(), name='work-item-updated-since'),
    path('query/', CustomWIQLQueryView.as_view(), name='custom-wiql-query'),
    path('<int:work_item_id>/hierarchy/', WorkItemHierarchyView.as_view(), name='work-item-hierarchy'),
    
    # Copilot Chat endpoints
    path('copilot/chat/', copilot_chat, name='copilot-chat'),
    path('copilot/chat/stream/', copilot_chat_stream, name='copilot-chat-stream'),
    path('copilot/chat/clear/', clear_chat_session, name='clear-chat-session'),
]
