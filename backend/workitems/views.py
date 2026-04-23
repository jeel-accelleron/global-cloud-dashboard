"""
Views for Work Items API
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

from .azure_devops_service import AzureDevOpsService
from .serializers import (
    WorkItemSerializer,
    WorkItemQuerySerializer,
    WorkItemSearchSerializer,
    WorkItemIdsSerializer,
    WorkItemDateRangeSerializer,
    WIQLQuerySerializer
)

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class WorkItemListView(APIView):
    """
    API endpoint to list work items with filters
    
    GET /api/workitems/
    Query Parameters:
        - work_item_type: Type of work item (Bug, Task, User Story, etc.)
        - state: Work item state (Active, Closed, etc.)
        - assigned_to: User assigned to the work item
        - area_path: Area path filter
        - iteration_path: Iteration path filter
        - tags: Comma-separated list of tags
        - top: Maximum number of results (default: 200)
    """
    
    def get(self, request):
        try:
            # Parse query parameters
            serializer = WorkItemQuerySerializer(data=request.query_params)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid query parameters', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            params = serializer.validated_data
            
            # Handle tags if provided as comma-separated string
            if 'tags' in request.query_params:
                tags_str = request.query_params.get('tags', '')
                params['tags'] = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
            
            # Initialize Azure DevOps service
            ado_service = AzureDevOpsService()
            
            # Get work items with filters
            work_items = ado_service.get_work_items_by_type(**params)
            
            return Response({
                'count': len(work_items),
                'results': work_items
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in WorkItemListView: {str(e)}")
            return Response(
                {'error': 'Failed to fetch work items', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class WorkItemByIdsView(APIView):
    """
    API endpoint to get work items by specific IDs
    
    POST /api/workitems/by-ids/
    Body:
        {
            "ids": [1, 2, 3, ...]
        }
    """
    
    def post(self, request):
        try:
            serializer = WorkItemIdsSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid request data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            ids = serializer.validated_data['ids']
            
            # Initialize Azure DevOps service
            ado_service = AzureDevOpsService()
            
            # Get work items by IDs
            work_items = ado_service.get_work_items_by_ids(ids=ids)
            
            return Response({
                'count': len(work_items),
                'results': work_items
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in WorkItemByIdsView: {str(e)}")
            return Response(
                {'error': 'Failed to fetch work items', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class WorkItemSearchView(APIView):
    """
    API endpoint to search work items by text
    
    GET /api/workitems/search/
    Query Parameters:
        - search_text: Text to search for (required)
        - work_item_types: Comma-separated list of work item types
        - top: Maximum number of results (default: 100)
    """
    
    def get(self, request):
        try:
            # Prepare data for serializer
            data = request.query_params.copy()
            
            # Handle work_item_types if provided as comma-separated string
            if 'work_item_types' in data:
                types_str = data.get('work_item_types', '')
                data['work_item_types'] = [t.strip() for t in types_str.split(',') if t.strip()]
            
            serializer = WorkItemSearchSerializer(data=data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid query parameters', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            params = serializer.validated_data
            
            # Initialize Azure DevOps service
            ado_service = AzureDevOpsService()
            
            # Search work items
            work_items = ado_service.search_work_items(**params)
            
            return Response({
                'count': len(work_items),
                'results': work_items
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in WorkItemSearchView: {str(e)}")
            return Response(
                {'error': 'Failed to search work items', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class WorkItemUpdatedSinceView(APIView):
    """
    API endpoint to get work items updated since a specific date
    
    GET /api/workitems/updated-since/
    Query Parameters:
        - since_date: ISO format date (YYYY-MM-DD) (required)
        - work_item_type: Type of work item to filter
        - top: Maximum number of results (default: 200)
    """
    
    def get(self, request):
        try:
            serializer = WorkItemDateRangeSerializer(data=request.query_params)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid query parameters', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            params = serializer.validated_data
            params['since_date'] = params['since_date'].isoformat()
            
            # Initialize Azure DevOps service
            ado_service = AzureDevOpsService()
            
            # Get updated work items
            work_items = ado_service.get_work_items_updated_since(**params)
            
            return Response({
                'count': len(work_items),
                'results': work_items
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in WorkItemUpdatedSinceView: {str(e)}")
            return Response(
                {'error': 'Failed to fetch updated work items', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class CustomWIQLQueryView(APIView):
    """
    API endpoint to execute custom WIQL queries
    
    POST /api/workitems/query/
    Body:
        {
            "query": "SELECT [System.Id] FROM WorkItems WHERE...",
            "top": 100,
            "team_context": "optional team name"
        }
    """
    
    def post(self, request):
        try:
            serializer = WIQLQuerySerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid request data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            params = serializer.validated_data
            
            # Initialize Azure DevOps service
            ado_service = AzureDevOpsService()
            
            # Execute custom WIQL query
            work_items = ado_service.query_work_items(
                wiql_query=params['query'],
                top=params.get('top'),
                team_context=params.get('team_context')
            )
            
            return Response({
                'count': len(work_items),
                'results': work_items
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in CustomWIQLQueryView: {str(e)}")
            return Response(
                {'error': 'Failed to execute WIQL query', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint
    
    GET /api/workitems/health/
    """
    try:
        # Try to initialize the service to verify configuration
        ado_service = AzureDevOpsService()
        return Response({
            'status': 'healthy',
            'message': 'Azure DevOps connection is configured',
            'project': ado_service.project
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'message': 'Failed to connect to Azure DevOps',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

