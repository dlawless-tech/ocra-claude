() => Array.from(document.querySelectorAll('a[ng-click^="AWS_S3_Uploader.getFile"]')).map(a => a.title).join('\n')
