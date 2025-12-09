{{- define "sentinelcare.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "sentinelcare.fullname" -}}
{{- printf "%s" .Chart.Name -}}
{{- end -}}
