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
    health_check
)

app_name = 'workitems'

urlpatterns = [
    # Health check
    path('health/', health_check, name='health-check'),
    
    # Work item endpoints
    path('', WorkItemListView.as_view(), name='work-item-list'),
    path('by-ids/', WorkItemByIdsView.as_view(), name='work-item-by-ids'),
    path('search/', WorkItemSearchView.as_view(), name='work-item-search'),
    path('updated-since/', WorkItemUpdatedSinceView.as_view(), name='work-item-updated-since'),
    path('query/', CustomWIQLQueryView.as_view(), name='custom-wiql-query'),
]
