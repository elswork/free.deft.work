stop: ## Stop container
	docker stop free.deft.work-app
build: ## Build Container
	docker build -t free.deft.work .
start: ## Start an container command
	docker run -d -p 8033:8033 --name free.deft.work-app free.deft.work