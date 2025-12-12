import json
import uuid

# Base structure for a visualization
def create_viz(id, title, type, visState_dict):
    return {
        "attributes": {
            "description": "",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": [],
                    "indexRefName": "search_0"
                })
            },
            "title": title,
            "uiStateJSON": "{}",
            "version": 1,
            "visState": json.dumps(visState_dict)
        },
        "coreMigrationVersion": "7.17.3",
        "id": id,
        "migrationVersion": {"visualization": "7.17.0"},
        "references": [{"id": "logstash-pattern", "name": "search_0", "type": "index-pattern"}],
        "type": "visualization",
        "updated_at": "2025-12-12T12:00:00.000Z",
        "version": "WzAsMV0="
    }

# 1. Log Distribution by Container (Bar Graph)
viz1_state = {
    "title": "Log Distribution by Container",
    "type": "histogram",
    "params": {
        "type": "histogram",
        "grid": {"categoryLines": False},
        "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom", "show": True, "style": {}, "scale": {"type": "linear"}, "labels": {"show": True, "truncate": 100}, "title": {}}],
        "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "left", "show": True, "style": {}, "scale": {"type": "linear", "mode": "normal"}, "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100}, "title": {"text": "Count"}}],
        "seriesParams": [{"show": "true", "type": "histogram", "mode": "stacked", "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1", "drawLinesBetweenPoints": True, "showCircles": True}],
        "addTooltip": True,
        "addLegend": True,
        "legendPosition": "right",
        "times": [],
        "addTimeMarker": False
    },
    "aggs": [
        {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
        {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "container.image.name.keyword", "orderBy": "1", "order": "desc", "size": 20, "otherBucket": False, "otherBucketLabel": "Other", "missingBucket": False, "missingBucketLabel": "Missing"}}
    ]
}
viz1 = create_viz("log-distribution-viz", "Log Distribution by Container", "histogram", viz1_state)

# 2. Application Logs over Time (Line Chart)
viz2_state = {
    "title": "Application Logs over Time",
    "type": "line", # Kibana uses 'line' type or histogram with type='line' in params. Let's use 'line' type directly if supported, or histogram with params.
    # Actually, standard line chart in Kibana is often type: "line" (for TSVB) or "histogram" with seriesParams type "line".
    # Let's stick to the standard aggregation based line chart which is type="histogram" but with specific params.
    "type": "histogram",
    "params": {
        "type": "line", # This makes it a line chart
        "grid": {"categoryLines": False},
        "categoryAxes": [{"id": "CategoryAxis-1", "type": "category", "position": "bottom", "show": True, "style": {}, "scale": {"type": "linear"}, "labels": {"show": True, "truncate": 100}, "title": {}}],
        "valueAxes": [{"id": "ValueAxis-1", "name": "LeftAxis-1", "type": "value", "position": "left", "show": True, "style": {}, "scale": {"type": "linear", "mode": "normal"}, "labels": {"show": True, "rotate": 0, "filter": False, "truncate": 100}, "title": {"text": "Count"}}],
        "seriesParams": [{"show": "true", "type": "line", "mode": "normal", "data": {"label": "Count", "id": "1"}, "valueAxis": "ValueAxis-1", "drawLinesBetweenPoints": True, "showCircles": True, "interpolate": "linear"}],
        "addTooltip": True,
        "addLegend": True,
        "legendPosition": "right",
        "times": [],
        "addTimeMarker": False
    },
    "aggs": [
        {"id": "1", "enabled": True, "type": "count", "schema": "metric", "params": {}},
        {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment", "params": {"field": "@timestamp", "timeRange": {"from": "now-15m", "to": "now"}, "useNormalizedEsInterval": True, "scaleMetricValues": False, "interval": "auto", "drop_partials": False, "min_doc_count": 1, "extended_bounds": {}}}
    ]
}
viz2 = create_viz("app-logs-line-viz", "Application Logs over Time", "histogram", viz2_state)

# 3. Dashboard
dashboard = {
    "attributes": {
        "description": "Dashboard for SentinelCare Application Logs",
        "hits": 0,
        "kibanaSavedObjectMeta": {
            "searchSourceJSON": json.dumps({"query": {"language": "kuery", "query": ""}, "filter": []})
        },
        "optionsJSON": json.dumps({"hidePanelTitles": False, "useMargins": True}),
        "panelsJSON": json.dumps([
            {"version": "7.17.3", "type": "visualization", "gridData": {"x": 0, "y": 0, "w": 24, "h": 15, "i": "3"}, "panelIndex": "3", "embeddableConfig": {}, "panelRefName": "panel_2"}
        ]),
        "timeRestore": False,
        "title": "SentinelCare Dashboard",
        "version": 1
    },
    "coreMigrationVersion": "7.17.3",
    "id": "sentinelcare-dashboard",
    "migrationVersion": {"dashboard": "7.17.0"},
    "references": [
        {"id": "app-logs-line-viz", "name": "panel_2", "type": "visualization"}
    ],
    "type": "dashboard",
    "updated_at": "2025-12-12T12:00:00.000Z",
    "version": "WzAsMV0="
}

# Output
print(json.dumps(viz2))
print(json.dumps(dashboard))
