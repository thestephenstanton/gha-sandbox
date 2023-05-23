build:
	ncc build index.js --license licenses.txt

push:
	git push --follow-tags
