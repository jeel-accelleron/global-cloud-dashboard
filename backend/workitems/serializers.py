"""
Serializers for Work Items API
"""
from rest_framework import serializers
from .utils.constants import DEFAULT_TOP_LIMIT, DEFAULT_SEARCH_LIMIT, MAX_TOP_LIMIT


class WorkItemSerializer(serializers.Serializer):
    """Serializer for work item data"""
    id = serializers.IntegerField()
    rev = serializers.IntegerField()
    url = serializers.URLField()
    fields = serializers.DictField()
    relations = serializers.ListField(child=serializers.DictField(), required=False)


class WorkItemQuerySerializer(serializers.Serializer):
    """Serializer for work item query parameters"""
    work_item_type = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    assigned_to = serializers.CharField(required=False, allow_blank=True)
    area_path = serializers.CharField(required=False, allow_blank=True)
    iteration_path = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    top = serializers.IntegerField(
        required=False, 
        default=DEFAULT_TOP_LIMIT, 
        min_value=1, 
        max_value=MAX_TOP_LIMIT
    )


class WorkItemSearchSerializer(serializers.Serializer):
    """Serializer for work item search parameters"""
    search_text = serializers.CharField(required=True, min_length=1)
    work_item_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    top = serializers.IntegerField(
        required=False, 
        default=DEFAULT_SEARCH_LIMIT, 
        min_value=1, 
        max_value=MAX_TOP_LIMIT
    )


class WorkItemIdsSerializer(serializers.Serializer):
    """Serializer for getting work items by IDs"""
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False,
        min_length=1
    )


class WorkItemDateRangeSerializer(serializers.Serializer):
    """Serializer for date range queries"""
    since_date = serializers.DateField(required=True)
    work_item_type = serializers.CharField(required=False, allow_blank=True)
    top = serializers.IntegerField(
        required=False, 
        default=DEFAULT_TOP_LIMIT, 
        min_value=1, 
        max_value=MAX_TOP_LIMIT
    )


class WIQLQuerySerializer(serializers.Serializer):
    """Serializer for custom WIQL queries"""
    query = serializers.CharField(required=True, min_length=1)
    top = serializers.IntegerField(required=False, min_value=1, max_value=MAX_TOP_LIMIT)
    team_context = serializers.CharField(required=False, allow_blank=True)
